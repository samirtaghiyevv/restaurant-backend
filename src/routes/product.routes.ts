import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import {
  authMiddleware,
  adminMiddleware,
} from "../middlewares/auth.middleware";

const router = Router();

// Public
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin only
router.post("/", authMiddleware, adminMiddleware, createProduct);
router.put("/:id", authMiddleware, adminMiddleware, updateProduct);
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

export default router;
