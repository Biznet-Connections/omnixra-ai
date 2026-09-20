import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reference: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "starter_biweekly",
        "plus_biweekly",
        "pro_monthly",
        "boost_20k",
        "boost_80k",
        "ai_matching",
        "bundle_ai_10",
        "priority_listing",
        "direct_message",
        "verified_badge_monthly",
        "company_boost_monthly",
      ],
    },
    plan: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled", "failed"],
      default: "pending",
      index: true,
    },
    phone: { type: String },
    email: { type: String },
    // Linkwa fields
    linkwaCheckoutUrl: { type: String },
    linkwaExternalLinkId: { type: String, index: true, sparse: true },
    linkwaShortUrl: { type: String, index: true, sparse: true },
    linkwaPaymentReference: { type: String, index: true, sparse: true },
    linkwaReceiptId: { type: String },
    // Metadata (postId for boosts, etc.)
    metadata: { type: Object, default: {} },
    // Raw payloads
    webhookPayload: { type: Object, default: null },
    webhookReceivedAt: { type: Date, default: null },
    statusResponse: { type: Object, default: null },
    // Lifecycle
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
