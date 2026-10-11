import mongoose from "mongoose";

const grievanceSchema = new mongoose.Schema(
  {
    // UNIQUE GRIEVANCE IDENTIFIER
    grievanceId: {
      type: String,
      required: true,
      unique: true,
      default: function() {
        return `GRV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    },

    // STUDENT INFORMATION
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // FACULTY INFORMATION
    assignedFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // PARENT INFORMATION (for escalation)
    parentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },

    // INITIAL GRIEVANCE DATA
    initialGrievance: {
      type: String,
      required: true,
      trim: true,
    },

    // AI ANALYSIS RESULTS
    aiAnalysis: {
      isValid: {
        type: Boolean,
        default: null,
      },

      validationReason: {
        type: String,
        sparse: true,
      },

      followUpQuestions: [String],

      studentAnswers: [
        {
          question: String,
          answer: String,
        },
      ],

      synthesizedMessage: {
        type: String,
        sparse: true,
      },

      analyzedAt: {
        type: Date,
        sparse: true,
      },
    },

    // GRIEVANCE STATUS
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "PENDING",
    },

    // RESOLUTION TRACKING
    resolution: {
      solvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        sparse: true,
      },

      studentVerificationRequired: {
        type: Boolean,
        default: false,
      },

      studentVerified: {
        type: Boolean,
        default: false,
      },

      studentVerificationAt: {
        type: Date,
        sparse: true,
      },

      resolvedAt: {
        type: Date,
        sparse: true,
      },
    },

    // TIMELINE FOR SLA MONITORING
    timeline: {
      createdAt: {
        type: Date,
        default: Date.now,
      },

      facultyReviewedAt: {
        type: Date,
        sparse: true,
      },

      firstResponseAt: {
        type: Date,
        sparse: true,
      },

      lastUpdateAt: {
        type: Date,
        default: Date.now,
      },

      first5MinNotification: { type: Boolean, default: false },
      first10MinNotification: { type: Boolean, default: false },
      lastNotificationAt: {
        type: Date,
        sparse: true,
      },

      notification24hSentAt: {
        type: Date,
        sparse: true,
      },

      notification48hSentAt: {
        type: Date,
        sparse: true,
      },
    },

    // ESCALATION TRACKING
    escalation: {
      escalatedToParent: {
        type: Boolean,
        default: false,
      },

      escalatedAt: {
        type: Date,
        sparse: true,
      },

      parentNotifiedAt: {
        type: Date,
        sparse: true,
      },
    },

    // ATTACHMENTS FROM FACULTY
    resolutionAttachments: [
      {
        fileName: String,
        fileUrl: String,
        uploadedAt: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // NOTES
    notes: {
      type: String,
      sparse: true,
    },

    // FEEDBACK
    studentFeedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        sparse: true,
      },

      comment: {
        type: String,
        sparse: true,
      },

      givenAt: {
        type: Date,
        sparse: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// INDEX FOR QUERIES
grievanceSchema.index({ student: 1, status: 1 });
grievanceSchema.index({ assignedFaculty: 1, status: 1 });
grievanceSchema.index({ parentUser: 1, status: 1 });
grievanceSchema.index({ "timeline.createdAt": 1 });
grievanceSchema.index({ status: 1, "timeline.createdAt": 1 });

const Grievance = mongoose.model("Grievance", grievanceSchema);

export default Grievance;
