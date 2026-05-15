import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Mock user for local development (bypasses Manus OAuth)
const LOCAL_DEV_USER: User = {
  id: 1,
  openId: "local-dev-user",
  name: "로컬 개발자",
  email: "dev@localhost",
  loginMethod: "local",
  role: "admin",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastSignedIn: new Date().toISOString(),
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // In local mode, always return mock user (no OAuth needed)
  let user: User | null = LOCAL_DEV_USER;

  // Ensure mock user exists in DB
  try {
    const existing = await db.getUserByOpenId(LOCAL_DEV_USER.openId);
    if (!existing) {
      await db.upsertUser({
        openId: LOCAL_DEV_USER.openId,
        name: LOCAL_DEV_USER.name,
        email: LOCAL_DEV_USER.email,
        loginMethod: LOCAL_DEV_USER.loginMethod,
        role: LOCAL_DEV_USER.role as "user" | "admin",
      });
    }
  } catch (error) {
    // DB might not be ready, that's ok
    console.warn("[Context] Could not sync mock user to DB:", error);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
