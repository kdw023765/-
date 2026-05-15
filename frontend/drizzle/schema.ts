import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = sqliteTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
  lastSignedIn: text("lastSignedIn").notNull().$defaultFn(() => new Date().toISOString()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Videos table: 업로드된 축구 경기 영상 정보
 */
export const videos = sqliteTable("videos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** 원본 영상 파일명 */
  fileName: text("fileName").notNull(),
  /** S3에 저장된 원본 영상 경로 */
  videoUrl: text("videoUrl").notNull(),
  /** S3에 저장된 원본 영상의 파일 키 */
  videoKey: text("videoKey").notNull(),
  /** 영상 크기 (바이트) */
  fileSize: integer("fileSize"),
  /** 영상 길이 (초) */
  duration: integer("duration"),
  /** 하이라이트 추출 상태: pending, processing, completed, failed */
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] }).default("pending").notNull(),
  /** 진행률 (0-100) */
  progress: integer("progress").default(0).notNull(),
  /** 처리 상태 메시지 */
  statusMessage: text("statusMessage"),
  /** 세션 ID (비로그인 사용자 추적용) */
  sessionId: text("sessionId"),
  /** 팀 정보 (홈팀/어웨이팀) */
  team: text("team"),
  /** 하이라이트 최소 길이 (초) */
  minHighlightDuration: integer("minHighlightDuration").default(5).notNull(),
  /** 하이라이트 최대 길이 (초) */
  maxHighlightDuration: integer("maxHighlightDuration").default(30).notNull(),
  /** 포함할 하이라이트 타입 (JSON 배열) */
  highlightTypes: text("highlightTypes"),
  /** 최소 신뢰도 점수 (0-100) */
  minConfidence: integer("minConfidence").default(70).notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/**
 * Highlights table: 추출된 하이라이트 클립 정보
 */
export const highlights = sqliteTable("highlights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** 원본 영상 ID */
  videoId: integer("videoId").notNull(),
  /** 하이라이트 타입: goal, post, foul */
  type: text("type", { enum: ["goal", "post", "foul"] }).notNull(),
  /** 하이라이트 시작 시간 (초) */
  startTime: integer("startTime").notNull(),
  /** 하이라이트 종료 시간 (초) */
  endTime: integer("endTime").notNull(),
  /** 추출된 하이라이트 클립 URL */
  clipUrl: text("clipUrl"),
  /** S3에 저장된 클립의 파일 키 */
  clipKey: text("clipKey"),
  /** 클립 파일 크기 (바이트) */
  clipSize: integer("clipSize"),
  /** 신뢰도 점수 (0-100) */
  confidence: integer("confidence"),
  /** 추가 메타데이터 (JSON) */
  metadata: text("metadata"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Highlight = typeof highlights.$inferSelect;
export type InsertHighlight = typeof highlights.$inferInsert;

/**
 * 테이블 관계 정의
 */
export const videosRelations = relations(videos, ({ many }) => ({
  highlights: many(highlights),
}));

export const highlightsRelations = relations(highlights, ({ one }) => ({
  video: one(videos, {
    fields: [highlights.videoId],
    references: [videos.id],
  }),
}));