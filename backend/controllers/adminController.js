// controllers/adminController.js
const { pool } = require("../config/db");

// GET /api/admin/dashboard
async function dashboard(req, res, next) {
  try {
    // Active sessions with their items
    const [activeSessions] = await pool.query(
      `SELECT s.id, s.status, s.started_at,
              u.full_name, u.phone,
              COUNT(si.id) as item_count,
              COALESCE(SUM(si.qty * si.unit_price), 0) as cart_total,
              COALESCE(SUM(si.qty * p.weight_kg), 0) as cart_weight
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN session_items si ON si.session_id = s.id
       LEFT JOIN products p ON p.id = si.product_id
       WHERE s.status IN ('active','paying')
       GROUP BY s.id
       ORDER BY s.started_at DESC`
    );

    // Load items for each active session
    for (const sess of activeSessions) {
      const [items] = await pool.query(
        `SELECT si.product_id, si.qty, si.unit_price,
                p.name, p.emoji, p.weight_kg
         FROM session_items si JOIN products p ON si.product_id=p.id
         WHERE si.session_id=?`,
        [sess.id]
      );
      sess.items = items;
    }

    // Completed today
    const [completedToday] = await pool.query(
      `SELECT s.id, s.ended_at,
              u.full_name, u.phone,
              t.total_amount, t.payment_method, t.id as txn_id,
              COUNT(si.id) as item_count
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN transactions t ON t.session_id = s.id
       LEFT JOIN session_items si ON si.session_id = s.id
       WHERE s.status = 'completed'
         AND DATE(s.ended_at) = CURDATE()
       GROUP BY s.id
       ORDER BY s.ended_at DESC`
    );

    // KPIs
    const [kpiRows] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM sessions WHERE status IN ('active','paying')) as active_sessions,
        (SELECT COALESCE(SUM(si.qty),0) FROM session_items si JOIN sessions s ON s.id=si.session_id WHERE s.status IN ('active','paying')) as live_items,
        (SELECT COALESCE(SUM(si.qty*si.unit_price),0) FROM session_items si JOIN sessions s ON s.id=si.session_id WHERE s.status IN ('active','paying')) as live_value,
        (SELECT COALESCE(SUM(total_amount),0) FROM transactions WHERE status='success' AND DATE(created_at)=CURDATE()) as today_revenue,
        (SELECT COUNT(*) FROM transactions WHERE status='success' AND DATE(created_at)=CURDATE()) as today_txns`
    );

    // Inventory - items being purchased today
    const [inventory] = await pool.query(
      `SELECT p.id, p.name, p.emoji, p.price,
              COALESCE(SUM(CASE WHEN s.status IN ('active','paying') THEN si.qty ELSE 0 END),0) as active_qty,
              COALESCE(SUM(CASE WHEN s.status='completed' AND DATE(s.ended_at)=CURDATE() THEN si.qty ELSE 0 END),0) as sold_qty,
              COALESCE(SUM(CASE WHEN s.status='completed' AND DATE(s.ended_at)=CURDATE() THEN si.qty*si.unit_price ELSE 0 END),0) as revenue
       FROM products p
       LEFT JOIN session_items si ON si.product_id=p.id
       LEFT JOIN sessions s ON s.id=si.session_id
       GROUP BY p.id
       HAVING active_qty > 0 OR sold_qty > 0
       ORDER BY (active_qty+sold_qty) DESC`
    );

    // Unresolved alerts
    const [alerts] = await pool.query(
      "SELECT * FROM alerts WHERE resolved=0 ORDER BY created_at DESC LIMIT 20"
    );

    res.json({
      success: true,
      kpis: kpiRows[0],
      activeSessions,
      completedToday,
      inventory,
      alerts,
    });
  } catch (err) { next(err); }
}

// GET /api/admin/alerts
async function getAlerts(req, res, next) {
  try {
    const [alerts] = await pool.query(
      "SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50"
    );
    res.json({ success: true, alerts });
  } catch (err) { next(err); }
}

// PATCH /api/admin/alerts/:id/resolve
async function resolveAlert(req, res, next) {
  try {
    await pool.query("UPDATE alerts SET resolved=1 WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
}

// GET /api/admin/users
async function getUsers(req, res, next) {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.full_name, u.phone, u.role, u.created_at,
              COUNT(DISTINCT s.id) as total_sessions,
              COALESCE(SUM(t.total_amount),0) as total_spent
       FROM users u
       LEFT JOIN sessions s ON s.user_id=u.id
       LEFT JOIN transactions t ON t.user_id=u.id AND t.status='success'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, users });
  } catch (err) { next(err); }
}

// GET /api/admin/revenue  — daily revenue for last 7 days
async function revenue(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT DATE(created_at) as date,
              COUNT(*) as transactions,
              SUM(total_amount) as revenue
       FROM transactions
       WHERE status='success' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`
    );
    res.json({ success: true, revenue: rows });
  } catch (err) { next(err); }
}

module.exports = { dashboard, getAlerts, resolveAlert, getUsers, revenue };
