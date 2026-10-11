import Class from "../models/Class.js";
import User from "../models/User.js";
import * as XLSX from "xlsx";

/* ================= CREATE CLASS ================= */
export const createClass = async (req, res) => {
  try {
    const { name, description } = req.body;

    const existingClass = await Class.findOne({
      name,
      faculty: req.user._id,
    });

    if (existingClass) {
      return res.status(400).json({ message: "Class with this name already exists" });
    }

    const newClass = await Class.create({
      name,
      description,
      faculty: req.user._id,
    });

    res.status(201).json(newClass);
  } catch (error) {
    console.error("Create Class Error:", error);
    res.status(500).json({ message: "Class creation failed" });
  }
};

/* ================= GET FACULTY CLASSES ================= */
export const getFacultyClasses = async (req, res) => {
  try {
    const classes = await Class.find({
      faculty: req.user._id,
      isActive: true,
    }).populate("students", "fullName email studentId");

    res.json(classes);
  } catch (error) {
    console.error("Get Classes Error:", error);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
};

/* ================= UPDATE CLASS ================= */
export const updateClass = async (req, res) => {
  try {
    const { name, description } = req.body;
    const { classId } = req.params;

    const classDoc = await Class.findOne({
      _id: classId,
      faculty: req.user._id,
    });

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (name && name !== classDoc.name) {
      const existingClass = await Class.findOne({
        name,
        faculty: req.user._id,
        _id: { $ne: classId },
      });

      if (existingClass) {
        return res.status(400).json({ message: "Class with this name already exists" });
      }
      classDoc.name = name;
    }

    if (description !== undefined) {
      classDoc.description = description;
    }

    await classDoc.save();
    res.json(classDoc);
  } catch (error) {
    console.error("Update Class Error:", error);
    res.status(500).json({ message: "Class update failed" });
  }
};

/* ================= DELETE CLASS ================= */
export const deleteClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findOne({
      _id: classId,
      faculty: req.user._id,
    });

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    classDoc.isActive = false;
    await classDoc.save();

    res.json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("Delete Class Error:", error);
    res.status(500).json({ message: "Class deletion failed" });
  }
};

/* ================= ADD STUDENTS TO CLASS ================= */
export const addStudentsToClass = async (req, res) => {
  try {
    const { studentIds } = req.body;
    const { classId } = req.params;

    const classDoc = await Class.findOne({
      _id: classId,
      faculty: req.user._id,
    });

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const students = await User.find({
      _id: { $in: studentIds },
      role: { $in: ["student", "learner"] },
    });

    if (students.length === 0) {
      return res.status(400).json({ message: "No valid students found" });
    }

    const existingStudentIds = classDoc.students.map(id => id.toString());
    const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id));

    classDoc.students.push(...newStudentIds);
    await classDoc.save();

    await User.updateMany(
      { _id: { $in: newStudentIds } },
      { $addToSet: { faculties: req.user._id } }
    );

    res.json({
      message: `Added ${newStudentIds.length} students to class`,
      class: classDoc,
    });
  } catch (error) {
    console.error("Add Students Error:", error);
    res.status(500).json({ message: "Failed to add students" });
  }
};

/* ================= REMOVE STUDENTS FROM CLASS ================= */
export const removeStudentsFromClass = async (req, res) => {
  try {
    const { studentIds } = req.body;
    const { classId } = req.params;

    const classDoc = await Class.findOne({
      _id: classId,
      faculty: req.user._id,
    });

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    classDoc.students = classDoc.students.filter(
      studentId => !studentIds.includes(studentId.toString())
    );
    await classDoc.save();

    await User.updateMany(
      { _id: { $in: studentIds } },
      { $pull: { faculties: req.user._id } }
    );

    res.json({
      message: `Removed ${studentIds.length} students from class`,
      class: classDoc,
    });
  } catch (error) {
    console.error("Remove Students Error:", error);
    res.status(500).json({ message: "Failed to remove students" });
  }
};

/* ================= UPLOAD EXCEL FOR BULK STUDENT ASSIGNMENT ================= */
export const uploadExcelForClass = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "Excel file is required" });
    }

    const classDoc = await Class.findOne({
      _id: classId,
      faculty: req.user._id,
    });

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const studentIdColumn = data[0].hasOwnProperty("studentId") ? "studentId" : 
                           data[0].hasOwnProperty("StudentId") ? "StudentId" : 
                           data[0].hasOwnProperty("student_id") ? "student_id" : null;

    if (!studentIdColumn) {
      return res.status(400).json({ 
        message: "Excel file must contain a 'studentId' column" 
      });
    }

    const studentIds = data.map(row => row[studentIdColumn]).filter(id => id);

    if (studentIds.length === 0) {
      return res.status(400).json({ message: "No student IDs found in Excel file" });
    }

    const students = await User.find({
      studentId: { $in: studentIds },
      role: { $in: ["student", "learner"] },
    });

    if (students.length === 0) {
      return res.status(400).json({ message: "No valid students found with given student IDs" });
    }

    const existingStudentIds = classDoc.students.map(id => id.toString());
    const newStudentIds = students
      .filter(student => !existingStudentIds.includes(student._id.toString()))
      .map(student => student._id);

    classDoc.students.push(...newStudentIds);
    await classDoc.save();

    await User.updateMany(
      { _id: { $in: newStudentIds } },
      { $addToSet: { faculties: req.user._id } }
    );

    res.json({
      message: `Successfully added ${newStudentIds.length} students to class from Excel file`,
      totalStudentsInExcel: studentIds.length,
      validStudentsFound: students.length,
      newStudentsAdded: newStudentIds.length,
      alreadyInClass: students.length - newStudentIds.length,
      class: classDoc,
    });
  } catch (error) {
    console.error("Excel Upload Error:", error);
    res.status(500).json({ message: "Excel upload failed" });
  }
};

/* ================= GET CLASS DETAILS ================= */
export const getClassDetails = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findOne({
      _id: classId,
      faculty: req.user._id,
      isActive: true,
    }).populate("students", "fullName email studentId");

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.json(classDoc);
  } catch (error) {
    console.error("Get Class Details Error:", error);
    res.status(500).json({ message: "Failed to fetch class details" });
  }
};