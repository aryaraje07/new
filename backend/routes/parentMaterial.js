const router = require("express").Router();
const auth = require("../middleware/auth");
const parentOnly = require("../middleware/parentOnly");

const { getChildMaterials } = require("../controllers/parentMaterial");

router.get(
  "/child/:studentId/materials",
  auth,
  parentOnly,
  getChildMaterials
);

router.get(
  "/child-materials/download/:childId/:materialId",
  auth,
  parentOnly,
  downloadChildMaterial
);

module.exports = router;
