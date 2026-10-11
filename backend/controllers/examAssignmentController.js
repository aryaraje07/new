import Exam from "../models/Exam.js";
import ExamAssignment from "../models/ExamAssignment.js";
import User from "../models/User.js";

export const assignStudentsToExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { scope, studentIds, assignedClass } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (exam.status !== "SCHEDULED") {
      return res.status(400).json({ message: "Exam must be scheduled first" });
    }

    let students = [];

    if (scope === "ALL") {
      // Get all students for this faculty
      const faculty = await User.findById(req.user._id);
      students = faculty.students || [];
    } else if (scope === "SELECTED") {
      const faculty = await User.findById(req.user._id).select("students");
      const allowedStudents = new Set((faculty?.students || []).map((id) => String(id)));
      students = (Array.isArray(studentIds) ? studentIds : [])
        .filter((id) => allowedStudents.has(String(id)));
      if (students.length === 0) {
        return res.status(400).json({ message: "Select at least one learner assigned to this trainer" });
      }
    } else if (scope === "CLASS") {
      // Get students from the selected class
      const Class = await import("../models/Class.js").then(m => m.default);
      const classDoc = await Class.findById(assignedClass).populate("students");
      
      if (!classDoc) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      students = classDoc.students.map(s => s._id);
    }

    // Update exam with assignment details
    exam.scope = scope;
    exam.assignedStudents = students;
    exam.assignedClass = assignedClass || null;
    await exam.save();

    const assignment = await ExamAssignment.create({
      exam: examId,
      students,
      assignedBy: req.user._id,
    });

    res.json({
      message: "Exam assigned successfully",
      assignmentId: assignment._id,
      scope: exam.scope,
      assignedStudents: exam.assignedStudents,
      assignedClass: exam.assignedClass,
    });
  } catch (err) {
    console.error("Exam assignment error:", err);
    res.status(500).json({ message: "Assignment failed" });
  }
};

export const assignExamToSemester = async (req, res) => {
  try {
    const { examId } = req.params;
    const { semesterId, assignedClass } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    // If assigning to a semester, require a class selection
    if (semesterId && !assignedClass) {
      return res.status(400).json({ message: 'assignedClass is required when assigning an exam to a semester' });
    }

    // attach semester and class
    exam.semester = semesterId || null;
    if (assignedClass) {
      exam.assignedClass = assignedClass;
      exam.scope = 'CLASS';
    } else {
      // if no class provided, default to ALL
      exam.scope = 'ALL';
      exam.assignedClass = null;
    }
    await exam.save();

    return res.json({ success: true, examId: exam._id });
  } catch (err) {
    console.error("Assign to semester failed:", err);
    return res.status(500).json({ message: "Failed to assign exam to semester" });
  }
};