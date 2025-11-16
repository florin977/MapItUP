import { Router } from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

const router = Router();
const upload = multer({ dest: "uploads/" });

// Test endpoint
router.get("/", (req, res) => {
  res.json({ message: "API is working!" });
});

export default router;
