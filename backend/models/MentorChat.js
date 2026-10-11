import mongoose from "mongoose";

const mentorChatSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  emotion: {
    type: String,
    enum: ["normal", "stressed"],
    default: "normal",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("MentorChat", mentorChatSchema);
