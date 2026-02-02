import express from "express";
import {
  getUsers,
  getUserOrders,
  getUserStats,
} from "../controllers/user.controller";
import {
  adminMiddleware,
  authMiddleware,
} from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/", authMiddleware, adminMiddleware, getUsers);
router.get("/:id/orders", authMiddleware, adminMiddleware, getUserOrders);
router.get("/:id/stats", authMiddleware, adminMiddleware, getUserStats);

export default router;
