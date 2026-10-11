const router = require("express").Router();
const auth = require("../middleware/auth");

const {
  getMyMaterials,
  downloadStudentMaterial
} = require("../controllers/studentMaterial");

router.get("/materials", auth, getMyMaterials);

// 👇 ADD THIS
router.get("/materials/download/:id", auth, downloadStudentMaterial);

module.exports = router;
