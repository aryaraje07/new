const router = require("express").Router();
const auth = require("../middleware/auth");
const facultyOnly = require("../middleware/facultyOnly");
const upload = require("../middleware/upload");

const { uploadMaterial } = require("../controllers/facultyMaterial");

router.post(
  "/material",
  auth,
  facultyOnly,
  upload.single("file"),
  uploadMaterial
);

module.exports = router;
