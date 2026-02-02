import { Request, Response } from "express";
import { pool } from "../utils/db";

// GET /api/users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.phone,
        u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_price),0) as total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// GET /api/users/:id/orders
export const getUserOrders = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, total_price, status, created_at 
       FROM orders 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user orders" });
  }
};

// GET /api/users/:id/stats
export const getUserStats = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        TO_CHAR(created_at::date, 'YYYY-MM-DD') as day,
        COUNT(*) as orders_count,
        SUM(total_price) as revenue
      FROM orders
      WHERE user_id = $1
      GROUP BY day
      ORDER BY day
      `,
      [id],
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user stats" });
  }
};
