import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    used: { type: Boolean, default: false },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date },
    durationDays: { type: Number, default: 30 }
  },
  { timestamps: true }
);

const Voucher = mongoose.model("Voucher", voucherSchema);
export default Voucher;
