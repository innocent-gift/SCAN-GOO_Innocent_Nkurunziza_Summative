// controllers/sessionController.js
const { pool } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// POST /api/sessions
async function create(req, res, next) {
  try {
    const id = "SESS-" + uuidv4().slice(0, 8).toUpperCase();
    await pool.query(
      "INSERT INTO sessions (id, user_id, status) VALUES (?, ?, 'active')",
      [id, req.user.id]
    );
    res.status(201).json({ success: true, sessionId: id });
  } catch (err) { next(err); }
}

// GET /api/sessions/:id
async function getOne(req, res, next) {
  try {
    const [sessions] = await pool.query(
      "SELECT s.*, u.full_name, u.phone FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.id=?",
      [req.params.id]
    );
    if (!sessions[0]) return res.status(404).json({ success: false, message: "Session not found" });
    if (req.user.role !== "admin" && sessions[0].user_id !== req.user.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const [items] = await pool.query(
      `SELECT si.product_id, si.qty, si.unit_price, si.scanned_at,
              p.name, p.emoji, p.weight_kg, p.barcode, p.age_restricted
       FROM session_items si JOIN products p ON si.product_id=p.id
       WHERE si.session_id=? ORDER BY si.scanned_at`,
      [req.params.id]
    );
    const total       = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
    const totalWeight = items.reduce((s, i) => s + parseFloat(i.weight_kg) * i.qty, 0);
    res.json({ success: true, session: { ...sessions[0], items, total, totalWeight } });
  } catch (err) { next(err); }
}

// PUT /api/sessions/:id/items
async function syncItems(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items))
      return res.status(400).json({ success: false, message: "items array required" });

    const [sessions] = await pool.query(
      "SELECT id, user_id, status FROM sessions WHERE id=?", [req.params.id]
    );
    if (!sessions[0]) return res.status(404).json({ success: false, message: "Session not found" });
    if (sessions[0].user_id !== req.user.id)
      return res.status(403).json({ success: false, message: "Forbidden" });
    if (sessions[0].status !== "active")
      return res.status(409).json({ success: false, message: "Session is not active" });

    await pool.query("DELETE FROM session_items WHERE session_id=?", [req.params.id]);

    if (items.length > 0) {
      const productIds = items.map(i => i.product_id);
      const [products] = await pool.query(
        "SELECT id, price FROM products WHERE id IN (?)", [productIds]
      );
      const priceMap = {};
      products.forEach(p => { priceMap[p.id] = p.price; });
      const values = items.map(i => [req.params.id, i.product_id, i.qty, priceMap[i.product_id] || 0]);
      await pool.query(
        "INSERT INTO session_items (session_id, product_id, qty, unit_price) VALUES ?",
        [values]
      );
    }

    const [weightResult] = await pool.query(
      `SELECT SUM(si.qty * p.weight_kg) as total_weight
       FROM session_items si JOIN products p ON si.product_id=p.id
       WHERE si.session_id=?`,
      [req.params.id]
    );
    const totalWeight = parseFloat(weightResult[0]?.total_weight || 0);
    if (totalWeight > 5) {
      await pool.query(
        "INSERT IGNORE INTO alerts (type, icon, title, detail, session_id) VALUES ('weight_exceeded','⚖️','Weight limit exceeded',?,?)",
        [`Cart weight ${totalWeight.toFixed(2)}kg exceeds 5kg — security check required`, req.params.id]
      );
    }
    res.json({ success: true, synced: items.length, totalWeight });
  } catch (err) { next(err); }
}

// POST /api/sessions/:id/checkout
async function checkout(req, res, next) {
  try {
    const { payment_method, payment_phone } = req.body;
    if (!payment_method)
      return res.status(400).json({ success: false, message: "payment_method required" });

    const [sessions] = await pool.query(
      "SELECT * FROM sessions WHERE id=?", [req.params.id]
    );
    if (!sessions[0]) return res.status(404).json({ success: false, message: "Session not found" });
    if (sessions[0].user_id !== req.user.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const [items] = await pool.query(
      `SELECT si.qty, si.unit_price, p.weight_kg
       FROM session_items si JOIN products p ON si.product_id=p.id
       WHERE si.session_id=?`,
      [req.params.id]
    );
    if (!items.length)
      return res.status(400).json({ success: false, message: "Cart is empty" });

    const total       = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
    const totalWeight = items.reduce((s, i) => s + parseFloat(i.weight_kg) * i.qty, 0);
    const txnId       = "TXN-" + uuidv4().slice(0, 8).toUpperCase();

    await pool.query("UPDATE sessions SET status='paying' WHERE id=?", [req.params.id]);
    await new Promise(resolve => setTimeout(resolve, 500));

    await pool.query(
      "INSERT INTO transactions (id, session_id, user_id, total_amount, total_weight, payment_method, payment_phone, status) VALUES (?,?,?,?,?,?,?,'success')",
      [txnId, req.params.id, req.user.id, total, totalWeight, payment_method, payment_phone || null]
    );
    await pool.query(
      "UPDATE sessions SET status='completed', ended_at=NOW() WHERE id=?",
      [req.params.id]
    );
    res.json({ success: true, txnId, total, totalWeight, paymentMethod: payment_method });
  } catch (err) { next(err); }
}

// GET /api/sessions/my
async function myHistory(req, res, next) {
  try {
    const [sessions] = await pool.query(
      `SELECT
         s.id, s.status, s.started_at, s.ended_at,
         COUNT(si.id)                        AS item_count,
         COALESCE(SUM(si.qty * si.unit_price), 0) AS total,
         MAX(t.payment_method)               AS payment_method,
         MAX(t.id)                           AS txn_id
       FROM sessions s
       LEFT JOIN session_items si ON si.session_id = s.id
       LEFT JOIN transactions  t  ON t.session_id  = s.id
       WHERE s.user_id = ?
         AND s.status IN ('completed', 'active')
       GROUP BY s.id, s.status, s.started_at, s.ended_at
       ORDER BY s.started_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json({ success: true, sessions });
  } catch (err) { next(err); }
}

module.exports = { create, getOne, syncItems, checkout, myHistory };
