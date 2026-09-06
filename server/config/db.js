import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is undefined");
    process.exit(1);
  }

  const options = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true
  };

  try {
    console.log("Connecting to MongoDB...");
    const conn = await mongoose.connect(uri, options);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    // Retry once after 3 seconds
    console.log("Retrying in 3 seconds...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const conn = await mongoose.connect(uri, options);
      console.log(`MongoDB connected on retry: ${conn.connection.host}`);
    } catch (retryError) {
      console.error("MongoDB retry failed:", retryError.message);
      process.exit(1);
    }
  }
};
