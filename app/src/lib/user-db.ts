/**
 * User auth, projects, and drafts database layer.
 * Uses better-sqlite3 in a dedicated vydeo_users.db file.
 */
import Database from "better-sqlite3";
import path from "path";
import { existsSync, mkdirSync } from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH  = path.join(DATA_DIR, "vydeo_users.db");

let _db: Database.Database | null = null;

export function getUserDb(): Database.Database {
  if (_db) return _db;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrateUserDb(_db);
  return _db;
}

function migrateUserDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      thumbnail TEXT,
      project_type TEXT NOT NULL DEFAULT 'custom',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'Untitled Draft',
      prompt TEXT,
      timeline_data TEXT,
      captions_data TEXT,
      transitions_data TEXT,
      effects_data TEXT,
      brand_settings TEXT,
      aspect_ratio TEXT DEFAULT '9:16',
      current_playhead REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      last_updated TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_drafts_user ON drafts(user_id);
    CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts(user_id, last_updated DESC);
  `);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  plan: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface DbProject {
  id: string;
  user_id: string;
  name: string;
  thumbnail: string | null;
  project_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbDraft {
  id: string;
  project_id: string | null;
  user_id: string;
  name: string;
  prompt: string | null;
  timeline_data: string | null;
  captions_data: string | null;
  transitions_data: string | null;
  effects_data: string | null;
  brand_settings: string | null;
  aspect_ratio: string;
  current_playhead: number;
  status: string;
  version: number;
  last_updated: string;
  created_at: string;
}

// ── User queries ──────────────────────────────────────────────────────────────

export const userQueries = {
  findByEmail: (email: string) =>
    getUserDb().prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email) as DbUser | undefined,

  findById: (id: string) =>
    getUserDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined,

  create: (u: Pick<DbUser, "id" | "first_name" | "last_name" | "email" | "password_hash" | "plan">) =>
    getUserDb().prepare(
      "INSERT INTO users (id, first_name, last_name, email, password_hash, plan) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(u.id, u.first_name, u.last_name, u.email, u.password_hash, u.plan),

  updateLastLogin: (id: string) =>
    getUserDb().prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(id),
};

// ── Project queries ───────────────────────────────────────────────────────────

export const projectQueries = {
  list: (userId: string) =>
    getUserDb().prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as DbProject[],

  findById: (id: string, userId: string) =>
    getUserDb().prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId) as DbProject | undefined,

  create: (p: Pick<DbProject, "id" | "user_id" | "name" | "thumbnail" | "project_type" | "status">) =>
    getUserDb().prepare(
      "INSERT INTO projects (id, user_id, name, thumbnail, project_type, status) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(p.id, p.user_id, p.name, p.thumbnail ?? null, p.project_type, p.status),

  update: (id: string, userId: string, patch: Partial<Pick<DbProject, "name" | "thumbnail" | "status">>) => {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.name !== undefined) { sets.push("name = ?"); vals.push(patch.name); }
    if (patch.thumbnail !== undefined) { sets.push("thumbnail = ?"); vals.push(patch.thumbnail); }
    if (patch.status !== undefined) { sets.push("status = ?"); vals.push(patch.status); }
    if (!sets.length) return;
    sets.push("updated_at = datetime('now')");
    vals.push(id, userId);
    getUserDb().prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).run(...vals);
  },

  delete: (id: string, userId: string) =>
    getUserDb().prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, userId),
};

// ── Draft queries ─────────────────────────────────────────────────────────────

export const draftQueries = {
  list: (userId: string) =>
    getUserDb().prepare("SELECT * FROM drafts WHERE user_id = ? ORDER BY last_updated DESC").all(userId) as DbDraft[],

  recent: (userId: string, limit = 8) =>
    getUserDb().prepare("SELECT * FROM drafts WHERE user_id = ? ORDER BY last_updated DESC LIMIT ?").all(userId, limit) as DbDraft[],

  findById: (id: string, userId: string) =>
    getUserDb().prepare("SELECT * FROM drafts WHERE id = ? AND user_id = ?").get(id, userId) as DbDraft | undefined,

  create: (d: Omit<DbDraft, "last_updated" | "created_at" | "version">) =>
    getUserDb().prepare(`
      INSERT INTO drafts (id, project_id, user_id, name, prompt, timeline_data, captions_data,
        transitions_data, effects_data, brand_settings, aspect_ratio, current_playhead, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(d.id, d.project_id ?? null, d.user_id, d.name, d.prompt ?? null,
      d.timeline_data ?? null, d.captions_data ?? null, d.transitions_data ?? null,
      d.effects_data ?? null, d.brand_settings ?? null, d.aspect_ratio, d.current_playhead, d.status),

  autosave: (d: Pick<DbDraft, "id" | "user_id" | "name" | "prompt" | "timeline_data" | "captions_data" |
    "transitions_data" | "effects_data" | "brand_settings" | "aspect_ratio" | "current_playhead" | "status">) =>
    getUserDb().prepare(`
      INSERT INTO drafts (id, user_id, name, prompt, timeline_data, captions_data,
        transitions_data, effects_data, brand_settings, aspect_ratio, current_playhead, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        prompt = excluded.prompt,
        timeline_data = excluded.timeline_data,
        captions_data = excluded.captions_data,
        transitions_data = excluded.transitions_data,
        effects_data = excluded.effects_data,
        brand_settings = excluded.brand_settings,
        aspect_ratio = excluded.aspect_ratio,
        current_playhead = excluded.current_playhead,
        status = excluded.status,
        version = version + 1,
        last_updated = datetime('now')
    `).run(d.id, d.user_id, d.name, d.prompt ?? null, d.timeline_data ?? null,
      d.captions_data ?? null, d.transitions_data ?? null, d.effects_data ?? null,
      d.brand_settings ?? null, d.aspect_ratio, d.current_playhead, d.status),

  rename: (id: string, userId: string, name: string) =>
    getUserDb().prepare("UPDATE drafts SET name = ?, last_updated = datetime('now') WHERE id = ? AND user_id = ?").run(name, id, userId),

  setStatus: (id: string, userId: string, status: string) =>
    getUserDb().prepare("UPDATE drafts SET status = ?, last_updated = datetime('now') WHERE id = ? AND user_id = ?").run(status, id, userId),

  delete: (id: string, userId: string) =>
    getUserDb().prepare("DELETE FROM drafts WHERE id = ? AND user_id = ?").run(id, userId),

  duplicate: (srcId: string, newId: string, userId: string, newName: string) => {
    const src = getUserDb().prepare("SELECT * FROM drafts WHERE id = ? AND user_id = ?").get(srcId, userId) as DbDraft | undefined;
    if (!src) return null;
    getUserDb().prepare(`
      INSERT INTO drafts (id, project_id, user_id, name, prompt, timeline_data, captions_data,
        transitions_data, effects_data, brand_settings, aspect_ratio, current_playhead, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(newId, src.project_id, src.user_id, newName, src.prompt, src.timeline_data,
      src.captions_data, src.transitions_data, src.effects_data, src.brand_settings,
      src.aspect_ratio, src.current_playhead);
    return newId;
  },
};
