import express from "express";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Boost from "../models/Boost.js";
import { protect } from "../middleware/auth.js";
import {
  createPaymentLink,
  getPaymentStatus,
  verifySignature,
} from "../utils/linkwa.js";

const router = express.Router();

// Server-side product catalog (never trust client)
const CATALOG = {
  starter_biweekly: {
    type: "starter_biweekly",
    amount: 5,
    label: "Starter Plan",
    description: "Inbox HR + Push My Profile - 14 days",
  },
  plus_biweekly: {
    type: "plus_biweekly",
    amount: 10,
    label: "Plus Plan",
    description: "Everything in Starter + visibility + AI - 14 days",
  },
  pro_monthly: {
    type: "pro_monthly",
    amount: 25,
    label: "Pro Plan",
    description: "Everything in Plus + notifications + badge - monthly",
  },
  boost_20k: {
    type: "boost_20k",
    amount: 2,
    label: "Boost Post - 20,000 reach",
    description: "20K reach on one post",
    reach: 20000,
  },
  boost_80k: {
    type: "boost_80k",
    amount: 5,
    label: "Boost Post - 80,000 reach",
    description: "80K reach on one post",
    reach: 80000,
  },
};

/**
 * POST /api/payments/initiate
 * Body: { planKey, metadata? }
 */
router.post("/initiate", protect, async (req, res) => {
  try {
    const { planKey, metadata = {} } = req.body;
    const plan = CATALOG[planKey];
    if (!plan) return res.status(400).json({ message: "Invalid plan" });

    const user = await User.findById(req.user._id);
    const reference =
      "OMX-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    const returnUrl =
      (process.env.LINKWA_RETURN_URL || "https://omnixra-ai.com/payment-complete") +
      "?reference=" +
      reference;

    const linkResult = await createPaymentLink({
      amount: plan.amount,
      name: "Omnixra - " + plan.label,
      description: plan.description,
      returnUrl,
      phone: user.phone || undefined,
      email: user.email || undefined,
      fullName: user.name || undefined,
    });

    if (!linkResult.success) {
      return res
        .status(400)
        .json({ message: linkResult.message || "Could not create checkout" });
    }

    const payment = await Payment.create({
      user: user._id,
      reference,
      type: plan.type,
      plan: planKey,
      amount: plan.amount,
      status: "pending",
      phone: user.phone || null,
      email: user.email || null,
      linkwaCheckoutUrl: linkResult.checkoutUrl,
      linkwaExternalLinkId: linkResult.externalPaymentLinkId,
      metadata: { ...metadata, planKey, reach: plan.reach || null },
    });

    return res.json({
      reference: payment.reference,
      checkoutUrl: linkResult.checkoutUrl,
      status: "pending",
    });
  } catch (error) {
    console.error("[payments/initiate] error:", error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/payments/status/:reference
 * Polls Linkwa if we don't have a final status yet.
 */
router.get("/status/:reference", protect, async (req, res) => {
  try {
    const payment = await Payment.findOne({ reference: req.params.reference });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (
      String(payment.user) !== String(req.user._id) &&
      req.user.accountType !== "admin"
    ) {
      return res.status(403).json({ message: "Not yours" });
    }

    // If already final, return
    if (payment.status === "paid" || payment.status === "failed") {
      return res.json(buildStatusResponse(payment));
    }

    // Need Linkwa short_url + payment_reference to poll.
    // These are set when the user returns from checkout, or via webhook.
    const shortUrl = req.query.short_url || payment.linkwaShortUrl;
    const paymentRef =
      req.query.payment_reference || payment.linkwaPaymentReference;

    if (shortUrl && paymentRef) {
      const result = await getPaymentStatus(shortUrl, paymentRef);
      payment.statusResponse = result;

      if (result.success && result.status === "PAID") {
        // Idempotency: only activate once
        if (payment.status !== "paid") {
          payment.status = "paid";
          payment.paidAt = new Date();
          payment.linkwaShortUrl = shortUrl;
          payment.linkwaPaymentReference = paymentRef;
          payment.linkwaReceiptId = result.receipt_id || null;
          await payment.save();
          await activateFeature(payment);
        }
      } else if (
        result.success &&
        (result.status === "FAILED" || result.status === "CANCELLED")
      ) {
        payment.status = "failed";
        payment.failureReason = result.status;
        await payment.save();
      } else {
        await payment.save();
      }
    }

    return res.json(buildStatusResponse(payment));
  } catch (e) {
    console.error("[payments/status] error:", e);
    return res.status(500).json({ message: e.message });
  }
});

/**
 * POST /api/payments/linkwa/webhook
 * Raw body verification required (set express.raw in server.js for this route)
 */
router.post(
  "/linkwa/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const raw = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);
      const signature = req.headers["x-linkwa-signature"];

      if (!verifySignature(raw, signature)) {
        console.warn("[linkwa/webhook] bad signature");
        return res.status(401).json({ message: "Invalid signature" });
      }

      const body = JSON.parse(raw);
      console.log("[linkwa/webhook] received:", {
        reference: body.reference,
        status: body.status,
        amount: body.amount,
      });

      // Immediately ack
      res.status(200).json({ received: true });

      // Process async
      if (body.status !== "PAID") return;

      // Match by external_payment_link_id (we stored it when creating the link)
      const externalId = body.external_payment_link_id;
      if (!externalId) return;

      const payment = await Payment.findOne({ linkwaExternalLinkId: externalId });
      if (!payment) {
        console.warn("[linkwa/webhook] no payment for external link:", externalId);
        return;
      }

      // Idempotency
      if (payment.status === "paid") {
        console.log("[linkwa/webhook] already paid, skipping");
        return;
      }

      // Amount check
      if (Number(body.amount) !== Number(payment.amount)) {
        console.warn("[linkwa/webhook] amount mismatch", body.amount, payment.amount);
        payment.status = "failed";
        payment.failureReason = "Amount mismatch";
        payment.webhookPayload = body;
        payment.webhookReceivedAt = new Date();
        await payment.save();
        return;
      }

      payment.status = "paid";
      payment.paidAt = new Date();
      payment.webhookPayload = body;
      payment.webhookReceivedAt = new Date();
      payment.linkwaReceiptId = body.receipt_id || null;
      await payment.save();

      await activateFeature(payment);
    } catch (e) {
      console.error("[linkwa/webhook] error:", e);
    }
  }
);

/**
 * GET /api/payments/my
 */
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

// ── helpers ──

function buildStatusResponse(payment) {
  return {
    reference: payment.reference,
    status: payment.status,
    paidAt: payment.paidAt,
    type: payment.type,
    plan: payment.plan,
    amount: payment.amount,
    checkoutUrl: payment.linkwaCheckoutUrl || null,
    message: payment.failureReason || null,
  };
}

async function activateFeature(payment) {
  try {
    const { type, user: userId, metadata } = payment;
    const now = new Date();

    if (type === "starter_biweekly" || type === "plus_biweekly" || type === "pro_monthly") {
      const days = type === "pro_monthly" ? 30 : 14;
      const tier =
        type === "starter_biweekly" ? "starter" :
        type === "plus_biweekly" ? "plus" : "pro";

      await User.findByIdAndUpdate(userId, {
        isPremium: true,
        subscriptionTier: tier,
        premiumPlan: tier === "pro" ? "monthly" : "none",
        subscriptionExpiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
        premiumExpiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
        lastPaymentId: payment._id,
      });
      console.log("[activate] tier:", tier, "user:", userId);
    } else if (type === "boost_20k" || type === "boost_80k") {
      const reach = metadata?.reach || (type === "boost_80k" ? 80000 : 20000);
      await Boost.create({
        userId,
        type: "post",
        postId: metadata?.postId || null,
        reach,
        price: payment.amount,
        status: "active",
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      });
      console.log("[activate] boost:", reach, "user:", userId);
    }

    try {
      const { notifyUser } = await import("../utils/notify.js");
      await notifyUser(userId, {
        title: "Payment confirmed",
        body: "Your purchase is now active.",
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
