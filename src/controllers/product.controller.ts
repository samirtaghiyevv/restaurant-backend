import { Request, Response } from "express";
import { pool } from "../utils/db";

// Create product (ADMIN)
export const createProduct = async (req: Request, res: Response) => {
  const { name, price, category, image } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: "Name and price are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name, price, category, image)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, price, category, image],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create product" });
  }
};

//Get all products (PUBLIC)
export const getProducts = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE is_available = true ORDER BY id DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

//  Get single product
export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

// Update product (ADMIN)
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, category, image, is_available } = req.body;

  try {
    const result = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           category = COALESCE($3, category),
           image = COALESCE($4, image),
           is_available = COALESCE($5, is_available)
       WHERE id = $6
       RETURNING *`,
      [name, price, category, image, is_available, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update product" });
  }
};

// Delete product (ADMIN)
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete product" });
  }
};
