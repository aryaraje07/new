import axios from "axios";
import Material from "../models/Material.js";
import cloudinary from "../config/cloudinary.js";
import Exam from "../models/Exam.js";
import { generateQuizQuestions } from "../services/quizGenerationService.js";

export const getStudentMaterials = async (req, res) => {
  const materials = await Material.find({
    $or: [
      { scope: "ALL" },
      { students: req.user._id },
    ],
  }).populate("faculty", "fullName");

  res.json(materials);
};

export const downloadStudentMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    const allowed =
      material.scope === "ALL" ||
      material.students.some(
        (id) => id.toString() === req.user._id.toString()
      );

    if (!allowed) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Fetch file from Cloudinary
    const fileResponse = await axios.get(material.filePath, {
      responseType: "stream",
    });

    // Set correct filename header manually
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${material.fileName}"`
    );

    res.setHeader("Content-Type", material.fileType);

    fileResponse.data.pipe(res);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Download failed" });
  }
};

export const generateStudentMaterialQuiz = async (req, res) => {
  try {
    const material = await Material.findOne({
      _id: req.params.id,
      $or: [{ scope: "ALL" }, { students: req.user._id }],
    });
    if (!material) return res.status(404).json({ message: "Material not found" });
    if (material.processingStatus !== "READY") return res.status(409).json({ message: `Material is ${material.processingStatus.toLowerCase()}.` });

    const sourceText = (material.chunks || []).slice(0, 8)
      .map((chunk) => `[${chunk.sourceReference}] ${chunk.text}`)
      .join("\n\n") || material.extractedText.slice(0, 12000);
    const questions = await generateQuizQuestions({
      subject: material.description || material.title,
      materialText: sourceText,
      questions: req.body.questionCount || 10,
      difficulty: "mixed",
      allowFallback: false,
      questionType: "knowledge",
      sourceReference: material.fileName,
      language: req.body.language || req.headers["x-learner-language"] || "en",
    });
    const exam = await Exam.create({
      title: `${material.title} quiz`,
      description: material.description,
      subject: material.description || material.title,
      faculty: material.faculty,
      duration: 30,
      totalQuestions: questions.length,
      questions,
      material: material._id,
      assessmentType: "MATERIAL",
      generatedByModel: process.env.OLLAMA_MODEL,
      status: "SCHEDULED",
      scope: "SELECTED",
      assignedStudents: [req.user._id],
      scheduledAt: new Date(),
    });
    res.status(201).json({ success: true, examId: exam._id });
  } catch (error) {
    console.error("STUDENT MATERIAL QUIZ ERROR:", error.message);
    res.status(503).json({ message: error.message || "Material quiz generation failed" });
  }
};
