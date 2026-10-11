import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not configured");
    }

    await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || "skillify_sih",
    });
    console.log(`MongoDB connected to ${process.env.DB_NAME || "skillify_sih"}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
