import mongoose from "mongoose";

const studentStressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    required: true,
  },
  stressCount: {
    type: Number,
    default: 0,
  },
  alerted: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("StudentStress", studentStressSchema);
