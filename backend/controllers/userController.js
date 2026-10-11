// face detection
import User from "../models/User.js";

export const getFaceEmbedding = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.faceData?.embedding) {
      return res.status(404).json({ message: "No face data found" });
    }

    res.json({
      embedding: user.faceData.embedding,
    });
  } catch (error) {
    console.error("Get Face Embedding Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyFaculties = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("faculties", "fullName email");

  res.json({ faculties: user.faculties });
};