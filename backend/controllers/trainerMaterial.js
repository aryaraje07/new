import Material from "../models/Material.js";
import Exam from "../models/Exam.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { generateQuizQuestions } from "../services/quizGenerationService.js";
import extractTextFromUrl from "../utils/extractText.js";
import { extractTextFromUploadedFile } from "../utils/extractText.js";
import Competency from "../models/Competency.js";
import { getLearnerCompetencyOverview } from "../services/competencyEngine.js";

const createChunks = (text, fileName) => String(text || "").replace(/\s+/g, " ").trim().match(/.{1,1200}(?:\s|$)/g)?.map((chunk, index) => ({
  index, text: chunk.trim(), sourceReference: `${fileName} — chunk ${index + 1}`,
  keywords: [...new Set((chunk.toLowerCase().match(/[a-z]{4,}/g) || []).slice(0, 30))],
})) || [];

const selectRelevantChunks = (chunks, competencies) => {
  const terms = competencies.flatMap((item) => item.name.toLowerCase().split(/[^a-z]+/)).filter((item) => item.length > 2);
  return [...chunks].sort((a, b) => terms.reduce((score, term) => score + (b.text.toLowerCase().includes(term) ? 1 : 0), 0) - terms.reduce((score, term) => score + (a.text.toLowerCase().includes(term) ? 1 : 0), 0)).slice(0, 8);
};

export const uploadMaterial = async (req, res) => {
  try {
    const {
      title,
      description,
      sendType,
      selectedStudents,
      assignedClass,
      competencyIds,
    } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    let studentsList = [];
    let classId = null;

    if (sendType === "ALL") {
      const allLearners = await User.find({ role: { $in: ["learner", "student"] } }).select("_id").lean();
      studentsList = allLearners.map(u => u._id);
    } else if (sendType === "SELECTED" && selectedStudents) {
      studentsList = JSON.parse(selectedStudents);
    } else if (sendType === "CLASS" && assignedClass) {
      const Class = await import("../models/Class.js").then(m => m.default);
      const classDoc = await Class.findById(assignedClass).populate("students");
      
      if (!classDoc) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      studentsList = classDoc.students.map(s => s._id);
      classId = assignedClass;
    }

    const requestedCompetencies = String(competencyIds || "").split(",").filter(Boolean);
    const validCompetencies = await Competency.find({ _id: { $in: requestedCompetencies } }).select("_id").lean();
    const materials = [];

    for (const file of req.files) {
      let fileUrl, publicId;
      
      // Try Cloudinary upload, fallback to local storage
      try {
        const result = await new Promise((resolve, reject) => {
          const fileNameWithoutExt = file.originalname.split(".")[0];

          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: "raw", // IMPORTANT
              folder: "skillify_materials",
              use_filename: true,
              unique_filename: false,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          stream.end(file.buffer);
        });
        
        fileUrl = result.secure_url;
        publicId = result.public_id;
      } catch (cloudinaryError) {
        console.warn("Cloudinary upload failed, using local storage:", cloudinaryError.message);
        
        // Fallback: Create a local file path (for demo purposes)
        const fs = await import('fs');
        const path = await import('path');
        const { v4: uuidv4 } = await import('uuid');
        
        const uploadDir = path.join(process.cwd(), 'uploads', 'materials');
        const fileName = `${uuidv4()}-${file.originalname}`;
        const filePath = path.join(uploadDir, fileName);
        
        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Save file locally
        fs.writeFileSync(filePath, file.buffer);
        
        fileUrl = `/uploads/materials/${fileName}`;
        publicId = fileName;
      }

      const material = await Material.create({
        title,
        description,
        fileName: file.originalname,
        fileType: file.mimetype,
        filePath: fileUrl,
        publicId: publicId,
        faculty: req.user._id,
        scope: sendType,
        students: studentsList,
        assignedClass: classId,
        competencies: validCompetencies.map((item) => item._id),
        processingStatus: "PROCESSING",
      });
      
      try {
        const extractedText = await extractTextFromUploadedFile(file);
        const chunks = createChunks(extractedText, file.originalname);
        if (!chunks.length) throw new Error("No extractable text was found in this material.");
        material.extractedText = extractedText.slice(0, 250000);
        material.chunks = chunks;
        material.processingStatus = "READY";
      } catch (processingError) {
        material.processingStatus = "FAILED";
        material.processingError = processingError.message;
      }
      await material.save();

      materials.push(material);
    }

    res.json({ success: true, materials });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: "Upload failed" });
  }
};


/*
==================================
GET ADMINISTRATOR MATERIALS
==================================
*/
export const getFacultyMaterials = async (req, res) => {
  try {
    const materials = await Material.find({ faculty: req.user._id })
      .sort({ createdAt: -1 })
      .select("title description fileName fileType competencies processingStatus processingError createdAt")
      .lean();

    res.json(materials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch materials" });
  }
};

/*
==================================
GET ADMINISTRATOR OFFICIALS
==================================
*/
export const getFacultyStudents = async (req, res) => {
  try {
    const facultyId = req.user._id;
    const faculty = await User.findById(facultyId).select("students").lean();
    const Exam = (await import("../models/Exam.js")).default;
    const examStudentIds = await Exam.distinct("assignedStudents", { faculty: facultyId });
    const linkedStudentIds = await User.find({ faculties: facultyId, role: { $in: ["learner", "student"] } }).distinct("_id");
    const ids = [...new Set([
      ...(faculty?.students || []),
      ...examStudentIds,
      ...linkedStudentIds,
    ].map((id) => String(id)))];
    const learners = await User.find({ _id: { $in: ids } })
      .select("fullName email phone studentId designation targetRole parents")
      .populate("parents", "fullName email phone parentId")
      .lean();

    const students = await Promise.all(learners.map(async (student) => ({
      ...student,
      competencyOverview: await getLearnerCompetencyOverview(student),
    })));

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch government officials" });
  }
};

/*
==================================
REMOVE OFFICIAL CONNECTION
==================================
*/
export const removeStudentConnection = async (req, res) => {
  try {
    const { studentId } = req.params; // Keep parameter name for route compatibility

    const administrator = await User.findById(req.user._id);
    const official = await User.findById(studentId);

    if (!official || !["student", "learner"].includes(official.role)) {
      return res.status(404).json({ message: "Government official not found" });
    }

    // Remove official from administrator
    administrator.students = administrator.students.filter(
      (id) => id.toString() !== official._id.toString()
    );

    // Remove administrator from official
    official.faculties = official.faculties.filter(
      (id) => id.toString() !== administrator._id.toString()
    );

    // Remove official from all parents
    if (official.parents.length > 0) {
      const parents = await User.find({ _id: { $in: official.parents } });

      for (const parent of parents) {
        parent.children = parent.children.filter(
          (id) => id.toString() !== official._id.toString()
        );
        await parent.save();
      }

      official.parents = [];
    }

    await administrator.save();
    await official.save();

    res.json({ message: "Government official connection removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove government official" });
  }
};

/*
==================================
GENERATE QUIZ FROM MATERIAL
==================================
*/
export const generateQuizFromMaterial = async (req, res) => {
  try {
    const { materialId, questionCount, difficulty, competencyIds, targetProficiencyLevel, questionType } = req.body;

    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    // Check authorization
    if (material.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to generate quiz from this material" });
    }

    if (material.processingStatus !== "READY") return res.status(409).json({ message: `Material is ${material.processingStatus.toLowerCase()}.` });
    const selectedIds = Array.isArray(competencyIds) && competencyIds.length ? competencyIds : material.competencies;
    const competencies = await Competency.find({ _id: { $in: selectedIds || [] } }).select("name domain").lean();
    const chunks = competencies.length
      ? selectRelevantChunks(material.chunks || [], competencies)
      : (material.chunks || []).slice(0, 8);
    const extractedText = chunks.map((chunk) => `[${chunk.sourceReference}] ${chunk.text}`).join("\n\n") || await extractTextFromUrl(material.filePath, material.fileName);

    // Generate quiz using AI Gateway
    const questions = await generateQuizQuestions({
      subject: material.description || material.title,
      materialText: extractedText,
      questions: questionCount || 10,
      difficulty: "mixed",
      allowFallback: false,
      competencyIds: competencies.map((item) => item._id),
      targetProficiencyLevel,
      questionType,
      sourceReference: chunks[0]?.sourceReference || material.fileName,
    });

    res.json({ 
      success: true, 
      material: {
        _id: material._id,
        title: material.title,
        classification: material.classification,
      },
      questions, processingStatus: material.processingStatus,
    });
  } catch (error) {
    console.error("QUIZ GENERATION ERROR:", error.message);
    const isPrivateProviderUnavailable = error.message.startsWith("PRIVATE_PROVIDER_UNAVAILABLE");
    res.status(isPrivateProviderUnavailable ? 503 : 500).json({
      message: "Quiz generation failed",
      error: error.message,
      reason: isPrivateProviderUnavailable
        ? "PRIVATE_PROVIDER_UNAVAILABLE"
        : undefined,
    });
  }
};

export const saveQuizFromMaterial = async (req, res) => {
  try {
    const { materialId, questions, title, subject, difficulty, duration = 60 } = req.body;
    const material = await Material.findOne({ _id: materialId, faculty: req.user._id });

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "At least one question is required" });
    }

    const exam = await Exam.create({
      title: title || material.title,
      description: material.description,
      subject: subject || material.description || material.title,
      difficulty: difficulty || "medium",
      duration: Number(duration) || 60,
      totalQuestions: questions.length,
      faculty: req.user._id, // Administrator uploading material
      status: "DRAFT",
      material: material._id,
      assessmentType: "MATERIAL",
      questions: questions.map((question, index) => ({
        questionId: String(question.questionId || question.id || `q_${index + 1}`),
        question: String(question.question || ""),
        options: Array.isArray(question.options) ? question.options.map(String).slice(0, 4) : [],
        correctAnswer: Number(question.correctAnswer ?? question.correct ?? 0),
        competency: question.competency || question.competencyId || undefined,
        competencyDomain: question.competencyDomain || undefined,
        difficulty: Number.isInteger(Number(question.difficulty)) ? Number(question.difficulty) : undefined,
        targetProficiencyLevel: Number(question.targetProficiencyLevel) || undefined,
        questionType: question.questionType || "knowledge",
        explanation: String(question.explanation || ""),
        sourceReference: String(question.sourceReference || material.fileName),
        aiGenerated: Boolean(question.aiGenerated),
      })),
    });

    return res.status(201).json({ success: true, examId: exam._id, status: exam.status });
  } catch (error) {
    console.error("SAVE MATERIAL QUIZ ERROR:", error.message);
    return res.status(500).json({ message: "Failed to save assessment" });
  }
};
