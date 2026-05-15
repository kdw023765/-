/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// Re-export Drizzle types for convenience
export type { Video, InsertVideo, Highlight, InsertHighlight } from "../drizzle/schema";
