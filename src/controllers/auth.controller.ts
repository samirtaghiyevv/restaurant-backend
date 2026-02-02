import { Request, Response } from "express";
import { pool } from "../utils/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Register
export const register = async (req: Request, res: Response) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if user exists
    const userCheck = await pool.query("SELECT * FROM users WHERE phone=$1", [
      phone,
    ]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const newUser = await pool.query(
      "INSERT INTO users (name, phone, password) VALUES ($1, $2, $3) RETURNING id, name, role",
      [name, phone, hashedPassword],
    );

    res.status(201).json({ message: "User created", user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const userRes = await pool.query("SELECT * FROM users WHERE phone=$1", [
      phone,
    ]);
    const user = userRes.rows[0];
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
