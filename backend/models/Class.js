import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  description: {
    type: String,
    trim: true,
  },
  
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

export default mongoose.model("Class", classSchema);