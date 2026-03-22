// routes/products.js
const router = require("express").Router();
const { getAll, getByBarcode, create, update } = require("../controllers/productController");
const { authenticate, requireAdmin } = require("../middleware/auth");

router.get("/",                authenticate, getAll);
router.get("/barcode/:barcode", authenticate, getByBarcode);
router.post("/",               authenticate, requireAdmin, create);
router.put("/:id",             authenticate, requireAdmin, update);

module.exports = router;
