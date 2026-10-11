//material and getfaculty

import Material from "../models/Material.js";
import User from "../models/User.js";


export const getChildMaterials = async (req, res) => {
  try {
    const { childId } = req.params;

    const parent = await User.findById(req.user._id);

    const isChild = parent.children.some(
      (id) => id.toString() === childId
    );

    if (!isChild) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const materials = await Material.find({
      students: childId,
    }).populate("faculty", "fullName");

    res.json(materials);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch materials" });
  }
};


export const downloadChildMaterial = async (req, res) => {
  try {
    const { childId, materialId } = req.params;

    const parent = req.user;

    const isChild = parent.children.some(
      (id) => id.toString() === childId
    );

    if (!isChild) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const material = await Material.findById(materialId);

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    const allowed = material.students.some(
      (id) => id.toString() === childId
    );

    if (!allowed) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const axios = (await import("axios")).default;

    const fileResponse = await axios.get(material.filePath, {
      responseType: "stream",
    });

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


export const getFacultyOfChildren = async (req, res) => {
  try {
    const parent = await User.findById(req.user._id)
      .populate({
        path: "children",
        populate: {
          path: "faculties",
          select: "fullName email phone facultyId",
        },
      });

    const result = parent.children.map((child) => ({
      studentName: child.fullName,
      studentId: child.studentId,
      faculties: child.faculties,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch faculty list" });
  }
};
