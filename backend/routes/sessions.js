// routes/sessions.js
const router = require("express").Router();
const { create, getOne, syncItems, checkout, myHistory } = require("../controllers/sessionController");
const { authenticate } = require("../middleware/auth");

router.get("/my",              authenticate, myHistory);
router.post("/",               authenticate, create);
router.get("/:id",             authenticate, getOne);
router.put("/:id/items",       authenticate, syncItems);
router.post("/:id/checkout",   authenticate, checkout);

module.exports = router;
