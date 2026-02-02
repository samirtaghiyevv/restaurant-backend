import { Router } from "express";
import {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderStats,
  getOrdersTrends,
  updateOrderStatus,
} from "../controllers/order.controller";
import {
  authMiddleware,
  adminMiddleware,
} from "../middlewares/auth.middleware";

const router = Router();

//User
router.post("/", authMiddleware, createOrder);
router.get("/my", authMiddleware, getMyOrders);

//Admin
router.get("/", authMiddleware, adminMiddleware, getAllOrders);
router.put("/:id/status", authMiddleware, adminMiddleware, updateOrderStatus);
router.get("/stats", authMiddleware, adminMiddleware, getOrderStats);
router.get("/trends", authMiddleware, adminMiddleware, getOrdersTrends);

export default router;
