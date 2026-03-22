// controllers/productController.js
const { pool } = require("../config/db");

// GET /api/products
async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, code, barcode, name, emoji, price, weight_kg, category, age_restricted, in_stock FROM products WHERE in_stock = 1 ORDER BY name"
    );
    res.json({ success: true, products: rows });
  } catch (err) { next(err); }
}

// GET /api/products/barcode/:barcode
async function getByBarcode(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, code, barcode, name, emoji, price, weight_kg, category, age_restricted, in_stock FROM products WHERE barcode = ?",
      [req.params.barcode]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/products  (admin only)
async function create(req, res, next) {
  try {
    const { code, barcode, name, emoji, price, weight_kg, category, age_restricted } = req.body;
    if (!code || !barcode || !name || !price)
      return res.status(400).json({ success: false, message: "code, barcode, name, price required" });

    const [result] = await pool.query(
      "INSERT INTO products (code, barcode, name, emoji, price, weight_kg, category, age_restricted) VALUES (?,?,?,?,?,?,?,?)",
      [code, barcode, name, emoji || "🛒", price, weight_kg || 0, category || "General", age_restricted ? 1 : 0]
    );
    res.status(201).json({ success: true, productId: result.insertId });
  } catch (err) { next(err); }
}

// PUT /api/products/:id  (admin only)
async function update(req, res, next) {
  try {
    const { name, emoji, price, weight_kg, category, age_restricted, in_stock } = req.body;
    await pool.query(
      "UPDATE products SET name=?, emoji=?, price=?, weight_kg=?, category=?, age_restricted=?, in_stock=? WHERE id=?",
      [name, emoji, price, weight_kg, category, age_restricted ? 1 : 0, in_stock ? 1 : 0, req.params.id]
    );
    res.json({ success: true, message: "Product updated" });
  } catch (err) { next(err); }
}

module.exports = { getAll, getByBarcode, create, update };
