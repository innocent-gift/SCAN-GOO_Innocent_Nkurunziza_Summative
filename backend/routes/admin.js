// routes/admin.js
const router = require("express").Router();
const { dashboard, getAlerts, resolveAlert, getUsers, revenue } = require("../controllers/adminController");
const { authenticate, requireAdmin } = require("../middleware/auth");

router.use(authenticate, requireAdmin);

router.get("/dashboard",           dashboard);
router.get("/alerts",              getAlerts);
router.patch("/alerts/:id/resolve", resolveAlert);
router.get("/users",               getUsers);
router.get("/revenue",             revenue);

module.exports = router;
