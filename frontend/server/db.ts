import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import { InsertUser, users, videos, highlights, Video, InsertVideo, Highlight, InsertHighlight } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance with SQLite
export async function getDb() {
  if (!_db) {
    try {
      const dbPath = path.resolve(process.cwd(), "local.db");
      const sqlite = new Database(dbPath);
      // Enable WAL mode for better concurrent access
      sqlite.pragma("journal_mode = WAL");
      _db = drizzle(sqlite);

      // Auto-create tables if they don't exist
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          openId TEXT NOT NULL UNIQUE,
          name TEXT,
          email TEXT,
          loginMethod TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
          lastSignedIn TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS videos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fileName TEXT NOT NULL,
          videoUrl TEXT NOT NULL,
          videoKey TEXT NOT NULL,
          fileSize INTEGER,
          duration INTEGER,
          status TEXT NOT NULL DEFAULT 'pending',
          progress INTEGER NOT NULL DEFAULT 0,
          statusMessage TEXT,
          sessionId TEXT,
          team TEXT,
          minHighlightDuration INTEGER NOT NULL DEFAULT 5,
          maxHighlightDuration INTEGER NOT NULL DEFAULT 30,
          highlightTypes TEXT,
          minConfidence INTEGER NOT NULL DEFAULT 70,
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS highlights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          videoId INTEGER NOT NULL,
          type TEXT NOT NULL,
          startTime INTEGER NOT NULL,
          endTime INTEGER NOT NULL,
          clipUrl TEXT,
          clipKey TEXT,
          clipSize INTEGER,
          confidence INTEGER,
          metadata TEXT,
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      console.log("[Database] SQLite connected at:", dbPath);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);

    if (existing.length > 0) {
      // Update
      const updateData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      if (user.name !== undefined) updateData.name = user.name ?? null;
      if (user.email !== undefined) updateData.email = user.email ?? null;
      if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod ?? null;
      if (user.lastSignedIn !== undefined) updateData.lastSignedIn = typeof user.lastSignedIn === 'string' ? user.lastSignedIn : new Date().toISOString();
      if (user.role !== undefined) {
        updateData.role = user.role;
      } else if (user.openId === ENV.ownerOpenId) {
        updateData.role = 'admin';
      }

      await db.update(users).set(updateData).where(eq(users.openId, user.openId));
    } else {
      // Insert
      const values: any = {
        openId: user.openId,
        name: user.name ?? null,
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? null,
        role: user.role ?? (user.openId === ENV.ownerOpenId ? 'admin' : 'user'),
        lastSignedIn: typeof user.lastSignedIn === 'string' ? user.lastSignedIn : new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.insert(users).values(values);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 비디오 관련 쿼리 함수
 */
export async function createVideo(video: InsertVideo): Promise<Video | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create video: database not available");
    return null;
  }

  try {
    const values: any = {
      ...video,
      highlightTypes: video.highlightTypes ? (typeof video.highlightTypes === 'string' ? video.highlightTypes : JSON.stringify(video.highlightTypes)) : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = await db.insert(videos).values(values).returning();
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create video:", error);
    throw error;
  }
}

export async function getVideoById(id: number): Promise<Video | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get video: database not available");
    return null;
  }

  const result = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getVideosBySessionId(sessionId: string): Promise<Video[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get videos: database not available");
    return [];
  }

  const result = await db.select().from(videos)
    .where(eq(videos.sessionId, sessionId))
    .orderBy(desc(videos.createdAt));
  return result;
}

export async function updateVideoSettings(id: number, settings: {
  team?: string;
  minHighlightDuration?: number;
  maxHighlightDuration?: number;
  highlightTypes?: string[];
  minConfidence?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update video settings: database not available");
    return;
  }

  try {
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (settings.team !== undefined) updateData.team = settings.team;
    if (settings.minHighlightDuration !== undefined) updateData.minHighlightDuration = settings.minHighlightDuration;
    if (settings.maxHighlightDuration !== undefined) updateData.maxHighlightDuration = settings.maxHighlightDuration;
    if (settings.highlightTypes !== undefined) updateData.highlightTypes = JSON.stringify(settings.highlightTypes);
    if (settings.minConfidence !== undefined) updateData.minConfidence = settings.minConfidence;

    await db.update(videos)
      .set(updateData)
      .where(eq(videos.id, id));
  } catch (error) {
    console.error("[Database] Failed to update video settings:", error);
    throw error;
  }
}

export async function updateVideoProgress(id: number, progress: number, status: string, statusMessage?: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update video: database not available");
    return;
  }

  try {
    await db.update(videos)
      .set({
        progress,
        status: status as any,
        statusMessage: statusMessage || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(videos.id, id));
  } catch (error) {
    console.error("[Database] Failed to update video progress:", error);
    throw error;
  }
}

export async function createHighlight(highlight: InsertHighlight): Promise<Highlight | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create highlight: database not available");
    return null;
  }

  try {
    const values: any = {
      ...highlight,
      metadata: highlight.metadata ? (typeof highlight.metadata === 'string' ? highlight.metadata : JSON.stringify(highlight.metadata)) : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = await db.insert(highlights).values(values).returning();
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create highlight:", error);
    throw error;
  }
}

export async function getHighlightsByVideoId(videoId: number): Promise<Highlight[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get highlights: database not available");
    return [];
  }

  const result = await db.select().from(highlights)
    .where(eq(highlights.videoId, videoId))
    .orderBy(highlights.startTime);
  return result;
}
