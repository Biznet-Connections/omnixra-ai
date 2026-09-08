import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
    viewed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Prevent duplicate pending requests
connectionRequestSchema.index({ sender: 1, recipient: 1, status: 1 });

const ConnectionRequest = mongoose.model("ConnectionRequest", connectionRequestSchema);
export default ConnectionRequest;
