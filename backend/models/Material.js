import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: String,

    fileName: String,
    fileType: String,
    filePath: String,

    publicId: {              // ✅ ADD THIS
      type: String,
      required: true,
    },

    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    scope: {
      type: String,
      enum: ["ALL", "SELECTED", "CLASS"],
      default: "ALL",
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    assignedClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },

    // MoSPI GSDD 2026 Classification
    classification: {
      type: String,
      enum: [
        // MoSPI GSDD 2026 Categories
        "CATEGORY_A_OPEN_ACCESS",
        "CATEGORY_B_REGISTERED_ACCESS",
        "CATEGORY_C_RESTRICTED_ACCESS",
        "NON_SHAREABLE",
        // Legacy/Other Classification Schemes
        "PUBLIC",
        "REGISTERED",
        "INTERNAL",
        "RESTRICTED",
        "UNCLASSIFIED",
        "UNKNOWN"
      ],
      default: "UNKNOWN",
    },

    classificationScheme: {
      type: String,
      enum: ["MOSPI_GSDD_2026", "ORGANIZATION_POLICY", "SOURCE_AUTHORITY_POLICY", "DOCUMENT_OWNER", "UNKNOWN"],
      default: "UNKNOWN",
    },

    classificationSource: {
      type: String,
      enum: ["MOSPI_GSDD_2026", "SOURCE_AUTHORITY_POLICY", "ORGANIZATION_POLICY", "DOCUMENT_OWNER", "UNKNOWN"],
      default: "UNKNOWN",
    },

    classificationReason: {
      type: String,
      default: "",
    },

    classifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    classifiedAt: {
      type: Date,
    },

    externalAIAllowed: {
      type: Boolean,
      default: false,
    },

    // Kept in MongoDB for a hackathon-scale RAG implementation. A dedicated
    // vector store can replace this without changing the assessment API.
    processingStatus: {
      type: String,
      enum: ["UPLOADING", "PROCESSING", "READY", "FAILED"],
      default: "UPLOADING",
    },
    processingError: { type: String, default: "" },
    extractedText: { type: String, default: "" },
    chunks: [{
      index: Number,
      text: String,
      sourceReference: String,
      keywords: [String],
    }],
    competencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Competency" }],
  },
  { timestamps: true }
);

export default mongoose.model("Material", materialSchema);
