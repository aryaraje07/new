import mongoose from "mongoose";

const aiNoteSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  overview: {
    type: String,
    required: true,
  },
  sections: [{
    heading: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    visuals: [{
      type: {
        type: String,
        enum: ["table", "flowchart", "mindmap", "diagram"],
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      data: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
    }],
    examples: [{
      type: String,
    }],
  }],
  summary: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
  }],
  isPublic: {
    type: Boolean,
    default: false,
  },
  downloadCount: {
    type: Number,
    default: 0,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for faster queries
aiNoteSchema.index({ student: 1, createdAt: -1 });
aiNoteSchema.index({ topic: 1 });
aiNoteSchema.index({ tags: 1 });
aiNoteSchema.index({ isPublic: 1 });

const AINote = mongoose.model("AINote", aiNoteSchema);

export default AINote;