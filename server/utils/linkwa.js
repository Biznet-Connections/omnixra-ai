import axios from "axios";
import crypto from "crypto";

const BASE_URL =
  process.env.LINKWA_BASE_URL ||
  "https://sandbox.linkwa.co.zw/api/v1/third-party";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.LINKWA_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Create a payment link. Returns { checkout_url, external_payment_link_id }.
 */
export async function createPaymentLink({
  amount,
  name,
  description,
  returnUrl,
  phone,
  email,
  fullName,
}) {
  try {
    const body = {
      amount: Number(amount),
      currency_code: "USD",
      payment_link_name: name,
      description: description || "",
      return_url: returnUrl,
      stock: 1,
    };

    if (phone || fullName || email) {
      body.autofill_contact_details = {};
      if (phone) body.autofill_contact_details.phone_number = phone;
      if (fullName) body.autofill_contact_details.full_name = fullName;
      if (email) body.autofill_contact_details.email = email;
    }

    const res = await axios.post(`${BASE_URL}/payment-links`, body, {
      headers: authHeaders(),
      timeout: 20000,
    });

    const link = res.data?.product || res.data?.payment_link || {};
    return {
      success: true,
      checkoutUrl: link.checkout_url,
      externalPaymentLinkId: link.external_payment_link_id,
      raw: res.data,
    };
  } catch (error) {
    const body = error?.response?.data || {};
    console.error("[Linkwa] createPaymentLink error:", error.message, body);
    return {
      success: false,
      message: body.message || error.message,
      raw: body,
    };
  }
}

/**
 * Get payment status. Returns { status, amount, currency_code, ... }.
 */
export async function getPaymentStatus(shortUrl, paymentReference) {
  try {
    const res = await axios.get(
      `${BASE_URL}/payment-links/${shortUrl}/payments/${paymentReference}/status`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return { success: true, ...res.data };
  } catch (error) {
    const body = error?.response?.data || {};
    console.error("[Linkwa] getPaymentStatus error:", error.message, body);
    return { success: false, message: body.message || error.message, raw: body };
  }
}

/**
 * Verify webhook signature using HMAC-SHA256 on raw body.
 */
export function verifySignature(rawBody, signature) {
  const secret = process.env.LINKWA_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[Linkwa] webhook secret not set - skipping verification");
    return true;
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
