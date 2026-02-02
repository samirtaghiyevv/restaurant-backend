import { Request, Response } from "express";
import { pool } from "../utils/db";
import { getIO } from "../socket";

// Create Order (USER)
export const createOrder = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Order items are required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let totalPrice = 0;

    // 1️⃣ Loop items
    for (const item of items) {
      const productRes = await client.query(
        "SELECT price FROM products WHERE id = $1 AND is_available = true",
        [item.productId],
      );

      if (productRes.rows.length === 0) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const price = Number(productRes.rows[0].price);
      totalPrice += price * item.quantity;
    }

    // 2️⃣ Insert order
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, total_price)
       VALUES ($1, $2)
       RETURNING id`,
      [userId, totalPrice],
    );

    const orderId = orderRes.rows[0].id;

    // 3️⃣ Insert order items
    for (const item of items) {
      const productRes = await client.query(
        "SELECT price FROM products WHERE id = $1",
        [item.productId],
      );

      const price = Number(productRes.rows[0].price);

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.productId, item.quantity, price],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Order created successfully",
      orderId,
      totalPrice,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error(err.message);
    res.status(500).json({ message: "Order creation failed" });
  } finally {
    client.release();
  }
};

// Get user's order history
export const getMyOrders = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const ordersRes = await pool.query(
      `
      SELECT 
        o.id AS order_id,
        o.total_price,
        o.status,
        o.created_at,
        oi.quantity,
        oi.price,
        p.id AS product_id,
        p.name AS product_name,
        p.image
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      `,
      [userId],
    );

    // 🧠 Group by order
    const ordersMap: any = {};

    for (const row of ordersRes.rows) {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          id: row.order_id,
          totalPrice: Number(row.total_price),
          status: row.status,
          createdAt: row.created_at,
          items: [],
        };
      }

      ordersMap[row.order_id].items.push({
        productId: row.product_id,
        name: row.product_name,
        image: row.image,
        quantity: row.quantity,
        price: Number(row.price),
      });
    }

    res.json(Object.values(ordersMap));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// Admin - get all orders
export const getAllOrders = async (_req: Request, res: Response) => {
  try {
    const ordersRes = await pool.query(`
      SELECT
        o.id AS order_id,
        o.total_price,
        o.status,
        o.created_at,
        u.id AS user_id,
        u.name AS user_name,
        u.phone,
        oi.quantity,
        oi.price,
        p.id AS product_id,
        p.name AS product_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      ORDER BY o.created_at DESC
    `);

    const ordersMap: any = {};

    for (const row of ordersRes.rows) {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          id: row.order_id,
          totalPrice: Number(row.total_price),
          status: row.status,
          createdAt: row.created_at,
          user: {
            id: row.user_id,
            name: row.user_name,
            phone: row.phone,
          },
          items: [],
        };
      }

      ordersMap[row.order_id].items.push({
        productId: row.product_id,
        name: row.product_name,
        quantity: row.quantity,
        price: Number(row.price),
      });
    }

    res.json(Object.values(ordersMap));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// Admin - update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["pending", "preparing", "ready", "cancelled"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const result = await pool.query(
      `UPDATE orders
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = result.rows[0];

    //  SOCKET EMIT (user-ə)
    const io = getIO();
    io.to(`user_${order.user_id}`).emit("order_status_update", {
      orderId: order.id,
      status: order.status,
    });

    res.json({
      message: "Order status updated",
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

export const getOrderStats = async (req: Request, res: Response) => {
  try {
    const totalOrders = await pool.query(`SELECT COUNT(*) FROM orders`);
    const pendingOrders = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE status='pending'`,
    );
    const preparingOrders = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE status='preparing'`,
    );
    const readyOrders = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE status='ready'`,
    );
    const cancelledOrders = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE status='cancelled'`,
    );
    const revenue = await pool.query(
      `SELECT COALESCE(SUM(total_price),0) FROM orders`,
    );

    res.json({
      totalOrders: Number(totalOrders.rows[0].count),
      pendingOrders: Number(pendingOrders.rows[0].count),
      preparingOrders: Number(preparingOrders.rows[0].count),
      readyOrders: Number(readyOrders.rows[0].count),
      cancelledOrders: Number(cancelledOrders.rows[0].count),
      totalRevenue: Number(revenue.rows[0].coalesce),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

// GET /api/orders/trends
export const getOrdersTrends = async (req: Request, res: Response) => {
  try {
    // daily orders + daily revenue for last 7 days
    const resQuery = await pool.query(`
      SELECT 
        TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day,
        COUNT(*) AS total_orders,
        COALESCE(SUM(total_price),0) AS total_revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day
    `);

    res.json(resQuery.rows); // [{day, total_orders, total_revenue}, ...]
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch trends" });
  }
};
