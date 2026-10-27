import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, default: "" },
    images: [{ type: String }],  // R2 URLs
    category: { type: String, default: "Other" },
    status: {
      type: String,
      enum: ["active", "sold", "draft", "archived"],
      default: "active",
      index: true,
    },
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    boosted: { type: Boolean, default: false },
    boostedAt: { type: Date },
  },
  { timestamps: true }
);

productSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
productSchema.index({ status: 1, createdAt: -1 });

const Product = mongoose.model("Product", productSchema);
export default Product;
