import type { Express } from "express";
import express from "express";
import path from "node:path";
import fs from "node:fs";

export function registerStorageProxy(app: Express) {
  const uploadDir = path.resolve(process.cwd(), "uploads");

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Serve uploaded files statically
  app.use("/local-storage", express.static(uploadDir));

  // Also handle the old manus-storage path for compatibility
  app.use("/manus-storage", express.static(uploadDir));
}
