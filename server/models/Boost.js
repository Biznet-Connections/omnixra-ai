import mongoose from "mongoose";

const boostSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["post", "cv", "profile"], required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    reach: { type: Number, required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
    voucherCode: { type: String },
    activatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }
  },
  { timestamps: true }
);

const Boost = mongoose.model("Boost", boostSchema);
export default Boost;
