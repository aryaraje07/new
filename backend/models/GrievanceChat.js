import mongoose from "mongoose";

const grievanceChatSchema = new mongoose.Schema(
  {
    // REFERENCE TO GRIEVANCE
    grievance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grievance",
      required: true,
    },

    // SENDER
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    senderRole: {
      type: String,
      enum: ["student", "faculty"],
      required: true,
    },

    // MESSAGE
    message: {
      type: String,
      trim: true,
      sparse: true,
    },

    // ATTACHMENTS (files uploaded by student or faculty)
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String, // pdf, jpg, png, docx, etc.
        fileSize: Number, // in bytes
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // MESSAGE TYPE
    messageType: {
      type: String,
      enum: ["TEXT", "FILE", "SYSTEM"],
      default: "TEXT",
    },

    // READ STATUS
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: Date,
      },
    ],

    // NOTIFICATION STATUS
    notificationSent: {
      type: Boolean,
      default: false,
    },

    notificationSentAt: {
      type: Date,
      sparse: true,
    },

    // FOR POPUP/INSTANT NOTIFICATION
    requiresNotification: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// INDEX FOR QUERIES
grievanceChatSchema.index({ grievance: 1, createdAt: 1 });
grievanceChatSchema.index({ sender: 1, createdAt: 1 });
grievanceChatSchema.index({ grievance: 1, readBy: 1 });
grievanceChatSchema.index({ createdAt: 1 });

const GrievanceChat = mongoose.model("GrievanceChat", grievanceChatSchema);

export default GrievanceChat;
