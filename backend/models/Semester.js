import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    faculty: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    classes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
    ],
    hasResultsDeclared: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Semester", semesterSchema);
