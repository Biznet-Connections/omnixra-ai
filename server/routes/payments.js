import express from "express";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Boost from "../models/Boost.js";
import { protect } from "../middleware/auth.js";
import { initiatePayment, mapStatusCode } from "../utils/contipay.js";

const router = express.Router();

const CATALOG = {
  boost_20k:       { type: "boost",           amount: 2,  reach: 20000 },
  boost_80k:       { type: "boost",           amount: 5,  reach: 80000 },
  push_cv:         { type: "push_cv",         amount: 5 },
  premium_monthly: { type: "premium_monthly", amount: 5 },
  premium_yearly:  { type: "premium_yearly",  amount: 45 },
};

router.post("/initiate", protect, async (req, res) => {
  try {
    const { planKey, phone, method, metadata = {} } = req.body;

    if (!planKey || !CATALOG[planKey]) {
      return res.status(400).json({ message: "Invalid plan" });
    }
    if (!phone || !/^07\d{8}$/.test(String(phone).trim())) {
      return res.status(400).json({ message: "Phone must be like 0771234567" });
    }
    if (!["ecocash", "innbucks", "onemoney"].includes(method)) {
      return res.status(400).json({ message: "Unsupported payment method" });
    }

    const plan = CATALOG[planKey];
    const reference = "OMX-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    const payment = await Payment.create({
      user: req.user._id,
      reference,
      type: plan.type,
      plan: planKey,
      amount: plan.amount,
      method,
      phone: String(phone).trim(),
      status: "pending",
      metadata: { ...metadata, planKey, reach: plan.reach || null },
    });

    const result = await initiatePayment({
      amount: plan.amount,
      phone: String(phone).trim(),
      provider: method,
      reference,
      description: "Omnixra " + planKey,
    });

    if (!result.success) {
      payment.status = "failed";
      payment.failureReason = result.message || "ContiPay rejected";
      await payment.save();
      return res.status(400).json({ message: result.message || "Payment initiation failed" });
    }

    payment.contipayReference = result.contipayReference;
    payment.contipayTransactionIndex = result.transactionIndex;
    payment.statusCode = result.statusCode;
    await payment.save();

    return res.json({
      reference,
      status: mapStatusCode(result.statusCode),
      instructions: "Check your phone - approve the USSD prompt to complete the payment.",
      provider: method,
    });
  } catch (error) {
    console.error("[payments/initiate] error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/contipay/webhook", async (req, res) => {
  const expectedToken = process.env.CONTIPAY_WEBHOOK_TOKEN;
  if (expectedToken) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const a = Buffer.from(token);
    const b = Buffer.from(expectedToken);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) {
      console.warn("[webhook] Bad auth token");
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  res.status(200).json({ received: true });

  try {
    const body = req.body || {};
    const merchantRef = body.merchantRef;
    const contiPayRef = body.contiPayRef ? String(body.contiPayRef) : null;
    const statusCode = body.statusCode;

    console.log("[webhook] received:", { merchantRef, contiPayRef, statusCode, status: body.status });

    if (!merchantRef) {
      console.warn("[webhook] missing merchantRef");
      return;
    }

    const payment = await Payment.findOne({ reference: merchantRef });
    if (!payment) {
      console.warn("[webhook] payment not found for ref:", merchantRef);
      return;
    }

    if (payment.status === "paid" || payment.status === "failed" || payment.status === "cancelled") {
      console.log("[webhook] already final, skipping:", payment.status);
      return;
    }

    payment.webhookPayload = body;
    payment.webhookReceivedAt = new Date();
    payment.statusCode = statusCode;
    if (contiPayRef && !payment.contipayReference) payment.contipayReference = contiPayRef;

    const newStatus = mapStatusCode(statusCode);

    if (newStatus === "paid") {
      const expected = Number(payment.amount);
      const received = Number(body.amount);
      const currency = String(body.currencyCode || "USD").toUpperCase();
      if (currency !== "USD" || (received && Math.abs(received - expected) > 0.01)) {
        console.warn("[webhook] amount/currency mismatch:", { expected, received, currency });
        payment.status = "failed";
        payment.failureReason = "Amount/currency mismatch: expected " + expected + " USD, got " + received + " " + currency;
        await payment.save();
        return;
      }

      payment.status = "paid";
      payment.paidAt = new Date();
      await payment.save();

      await activateFeature(payment);
    } else if (newStatus === "failed") {
      payment.status = "failed";
      payment.failureReason = body.message || "Declined";
      await payment.save();
    } else {
      await payment.save();
    }
  } catch (e) {
    console.error("[webhook] processing error:", e);
  }
});

router.get("/status/:reference", protect, async (req, res) => {
  try {
    const payment = await Payment.findOne({ reference: req.params.reference });
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (String(payment.user) !== String(req.user._id) && req.user.accountType !== "admin") {
      return res.status(403).json({ message: "Not yours" });
    }
    res.json({
      reference: payment.reference,
      status: payment.status,
      paidAt: payment.paidAt,
      type: payment.type,
      plan: payment.plan,
      amount: payment.amount,
      message: payment.failureReason || null,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/my", protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(payments);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

async function activateFeature(payment) {
  try {
    const { type, user: userId, metadata } = payment;

    if (type === "boost") {
      const reach = metadata?.reach || 20000;
      await Boost.create({
        userId,
        type: "post",
        postId: metadata?.postId || null,
        reach,
        price: payment.amount,
        status: "active",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      console.log("[activate] boost created for user", userId, "reach", reach);
    } else if (type === "push_cv") {
      await User.findByIdAndUpdate(userId, { $inc: { pushCredits: 1 } });
      console.log("[activate] push CV credit +1 for user", userId);
    } else if (type === "premium_monthly" || type === "premium_yearly") {
      const days = type === "premium_yearly" ? 365 : 30;
      const plan = type === "premium_yearly" ? "yearly" : "monthly";
      await User.findByIdAndUpdate(userId, {
        isPremium: true,
        premiumPlan: plan,
        premiumExpiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        lastPaymentId: payment._id,
      });
      console.log("[activate] premium", plan, "for user", userId);
    }

    try {
      const { notifyUser } = await import("../utils/notify.js");
      await notifyUser(userId, {
        title: "Payment confirmed",
        body: "Your " + type.replace(/_/g, " ") + " is now active.",
        data: { type: "payment", reference: payment.reference },
      });
    } catch (e) {
      console.warn("[activate] notify failed:", e.message);
    }
  } catch (e) {
    console.error("[activate] error:", e);
  }
}

export default router;
