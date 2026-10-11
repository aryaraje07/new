import Semester from "../models/Semester.js";
import User from "../models/User.js";
import Exam from "../models/Exam.js";
import xlsx from "xlsx";

/* Create Semester */
export const createSemester = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    const existing = await Semester.findOne({ name });
    if (existing) return res.status(409).json({ message: "Semester exists" });

    const sem = await Semester.create({ name });
    return res.json(sem);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create semester" });
  }
};

/* List all semesters (admin) */
export const listSemesters = async (req, res) => {
  try {
    const list = await Semester.find()
      .sort({ createdAt: -1 })
      .populate('faculty', 'fullName facultyId email')
      .lean();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to list semesters" });
  }
};

/* Assign faculty via uploaded Excel (expects file in memory via multer) */
export const assignFacultyFromExcel = async (req, res) => {
  try {
    const { semesterId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "File required" });

    const wb = xlsx.read(file.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const facultyIds = [];
    for (const r of rows) {
      const keys = Object.keys(r);
      const key = keys.find((k) => k.toLowerCase() === "facultyid");
      if (key && r[key]) facultyIds.push(String(r[key]).trim());
    }

    if (!facultyIds.length)
      return res.status(400).json({ message: "No facultyId column found" });

    // find users by facultyId
    const users = await User.find({ facultyId: { $in: facultyIds } }).select("_id facultyId fullName");

    const semester = await Semester.findById(semesterId);
    if (!semester) return res.status(404).json({ message: "Semester not found" });

    const toAdd = users.map((u) => u._id).filter((id) => !semester.faculty.includes(id));
    if (toAdd.length) {
      semester.faculty.push(...toAdd);
      await semester.save();
    }

    return res.json({ added: toAdd.length, matched: users.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to assign faculty" });
  }
};

/* Get semesters assigned to a faculty (for faculty UI) */
export const getSemestersForFaculty = async (req, res) => {
  try {
    const facultyId = req.user._id;
    const semesters = await Semester.find({ faculty: facultyId }).lean();
    return res.json(semesters);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch semesters" });
  }
};

/* Declare results for semester (admin) */
export const declareResults = async (req, res) => {
  try {
    const { semesterId } = req.params;
    const sem = await Semester.findById(semesterId);
    if (!sem) return res.status(404).json({ message: "Semester not found" });

    sem.hasResultsDeclared = true;
    await sem.save();

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to declare results" });
  }
};

/* Fetch results (exam attempts and quiz attempts) for a semester */
export const getSemesterResults = async (req, res) => {
  try {
    const { semesterId } = req.params;

    const exams = await Exam.find({ semester: semesterId }).select("_id title");
    const examIds = exams.map((e) => e._id);

    // ExamAttempt model used elsewhere; require here to avoid cycles
    const ExamAttempt = await import("../models/ExamAttempt.js").then((m) => m.default);
    const QuizAttempt = await import("../models/QuizAttempt.js").then((m) => m.default);

    // populate exam details (title, subject, scheduledAt) for filtering and display
    const examAttemptsRaw = await ExamAttempt.find({ exam: { $in: examIds } })
      .populate("student", "fullName studentId")
      .populate("exam", "title subject scheduledAt totalQuestions")
      .lean();

    // filter out attempts where the exam has no scheduledAt (invalid/placeholder)
    let examAttemptsFiltered = examAttemptsRaw.filter((ea) => ea.exam && ea.exam.scheduledAt);

    // deduplicate attempts by exam + student: keep the latest submittedAt (or createdAt)
    const dedupMap = new Map();
    for (const ea of examAttemptsFiltered) {
      const key = `${String(ea.exam._id)}_${String(ea.student?._id || ea.student)}`;
      const existing = dedupMap.get(key);
      const time = ea.submittedAt ? new Date(ea.submittedAt).getTime() : new Date(ea.createdAt || 0).getTime();
      if (!existing) {
        dedupMap.set(key, { attempt: ea, time });
      } else if (time > existing.time) {
        dedupMap.set(key, { attempt: ea, time });
      }
    }
    const examAttempts = Array.from(dedupMap.values()).map(v => v.attempt);

    const quizAttemptsRaw = await QuizAttempt.find({
      quizType: "SCHEDULED",
      quizId: { $in: examIds.map((id) => String(id)) },
      isFinalized: true,
    })
      .populate("student", "fullName studentId")
      .lean();

    // filter quiz attempts with a valid submittedAt
    const quizAttempts = quizAttemptsRaw.filter((qa) => qa.submittedAt || qa.createdAt);

    return res.json({ examAttempts, quizAttempts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch semester results" });
  }
};
