import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reference: { type: String, required: true, unique: true, index: true },
    contipayReference: { type: String, index: true, sparse: true },
    contipayTransactionIndex: { type: Number, index: true, sparse: true },
    type: {
      type: String,
      required: true,
      enum: ["boost", "push_cv", "premium_monthly", "premium_yearly"],
    },
    plan: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    method: { type: String, enum: ["ecocash", "innbucks", "onemoney", "card"], required: true },
    phone: { type: String },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled", "failed"],
      default: "pending",
      index: true,
    },
    statusCode: { type: Number, default: null },
    metadata: { type: Object, default: {} },
    webhookPayload: { type: Object, default: null },
    webhookReceivedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
