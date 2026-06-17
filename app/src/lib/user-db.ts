/**
 * User auth, projects, and drafts database layer — MongoDB.
 */

import { getDb } from "./mongodb";

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
  findByEmail: async (email: string): Promise<DbUser | undefined> => {
    const db = await getDb();
    const doc = await db.collection("users").findOne(
      { email: email.toLowerCase() },
      { projection: { _id: 0 } },
    );
    return doc as unknown as DbUser | undefined;
  },

  findById: async (id: string): Promise<DbUser | undefined> => {
    const db = await getDb();
    const doc = await db.collection("users").findOne(
      { id },
      { projection: { _id: 0 } },
    );
    return doc as unknown as DbUser | undefined;
  },

  create: async (u: Pick<DbUser, "id" | "first_name" | "last_name" | "email" | "password_hash" | "plan">): Promise<void> => {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.collection("users").insertOne({
      ...u,
      email: u.email.toLowerCase(),
      created_at: now,
      updated_at: now,
      last_login_at: null,
    });
  },

  updateLastLogin: async (id: string): Promise<void> => {
    const db = await getDb();
    await db.collection("users").updateOne(
      { id },
      { $set: { last_login_at: new Date().toISOString() } },
    );
  },
};

// ── Project queries ───────────────────────────────────────────────────────────

export const projectQueries = {
  list: async (userId: string): Promise<DbProject[]> => {
    const db = await getDb();
    const docs = await db.collection("projects")
      .find({ user_id: userId }, { projection: { _id: 0 } })
      .sort({ updated_at: -1 })
      .toArray();
    return docs as unknown as DbProject[];
  },

  findById: async (id: string, userId: string): Promise<DbProject | undefined> => {
    const db = await getDb();
    const doc = await db.collection("projects").findOne(
      { id, user_id: userId },
      { projection: { _id: 0 } },
    );
    return doc as unknown as DbProject | undefined;
  },

  create: async (p: Pick<DbProject, "id" | "user_id" | "name" | "thumbnail" | "project_type" | "status">): Promise<void> => {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.collection("projects").insertOne({
      ...p,
      thumbnail: p.thumbnail ?? null,
      created_at: now,
      updated_at: now,
    });
  },

  update: async (id: string, userId: string, patch: Partial<Pick<DbProject, "name" | "thumbnail" | "status">>): Promise<void> => {
    if (!Object.keys(patch).length) return;
    const db = await getDb();
    await db.collection("projects").updateOne(
      { id, user_id: userId },
      { $set: { ...patch, updated_at: new Date().toISOString() } },
    );
  },

  delete: async (id: string, userId: string): Promise<void> => {
    const db = await getDb();
    await db.collection("projects").deleteOne({ id, user_id: userId });
    await db.collection("drafts").updateMany(
      { project_id: id, user_id: userId },
      { $set: { project_id: null } },
    );
  },
};

// ── Draft queries ─────────────────────────────────────────────────────────────

export const draftQueries = {
  list: async (userId: string): Promise<DbDraft[]> => {
    const db = await getDb();
    const docs = await db.collection("drafts")
      .find({ user_id: userId }, { projection: { _id: 0 } })
      .sort({ last_updated: -1 })
      .toArray();
    return docs as unknown as DbDraft[];
  },

  recent: async (userId: string, limit = 8): Promise<DbDraft[]> => {
    const db = await getDb();
    const docs = await db.collection("drafts")
      .find({ user_id: userId }, { projection: { _id: 0 } })
      .sort({ last_updated: -1 })
      .limit(limit)
      .toArray();
    return docs as unknown as DbDraft[];
  },

  findById: async (id: string, userId: string): Promise<DbDraft | undefined> => {
    const db = await getDb();
    const doc = await db.collection("drafts").findOne(
      { id, user_id: userId },
      { projection: { _id: 0 } },
    );
    return doc as unknown as DbDraft | undefined;
  },

  create: async (d: Omit<DbDraft, "last_updated" | "created_at" | "version">): Promise<void> => {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.collection("drafts").insertOne({
      ...d,
      project_id: d.project_id ?? null,
      prompt: d.prompt ?? null,
      timeline_data: d.timeline_data ?? null,
      captions_data: d.captions_data ?? null,
      transitions_data: d.transitions_data ?? null,
      effects_data: d.effects_data ?? null,
      brand_settings: d.brand_settings ?? null,
      version: 1,
      last_updated: now,
      created_at: now,
    });
  },

  autosave: async (d: Pick<DbDraft, "id" | "user_id" | "name" | "prompt" | "timeline_data" | "captions_data" |
    "transitions_data" | "effects_data" | "brand_settings" | "aspect_ratio" | "current_playhead" | "status">): Promise<void> => {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.collection("drafts").updateOne(
      { id: d.id, user_id: d.user_id },
      {
        $set: {
          name: d.name,
          prompt: d.prompt ?? null,
          timeline_data: d.timeline_data ?? null,
          captions_data: d.captions_data ?? null,
          transitions_data: d.transitions_data ?? null,
          effects_data: d.effects_data ?? null,
          brand_settings: d.brand_settings ?? null,
          aspect_ratio: d.aspect_ratio,
          current_playhead: d.current_playhead,
          status: d.status,
          last_updated: now,
        },
        $inc: { version: 1 },
        $setOnInsert: { id: d.id, user_id: d.user_id, created_at: now },
      },
      { upsert: true },
    );
  },

  rename: async (id: string, userId: string, name: string): Promise<void> => {
    const db = await getDb();
    await db.collection("drafts").updateOne(
      { id, user_id: userId },
      { $set: { name, last_updated: new Date().toISOString() } },
    );
  },

  setStatus: async (id: string, userId: string, status: string): Promise<void> => {
    const db = await getDb();
    await db.collection("drafts").updateOne(
      { id, user_id: userId },
      { $set: { status, last_updated: new Date().toISOString() } },
    );
  },

  delete: async (id: string, userId: string): Promise<void> => {
    const db = await getDb();
    await db.collection("drafts").deleteOne({ id, user_id: userId });
  },

  duplicate: async (srcId: string, newId: string, userId: string, newName: string): Promise<string | null> => {
    const db = await getDb();
    const src = await db.collection("drafts").findOne(
      { id: srcId, user_id: userId },
      { projection: { _id: 0 } },
    ) as unknown as DbDraft | null;
    if (!src) return null;
    const now = new Date().toISOString();
    await db.collection("drafts").insertOne({
      ...src,
      id: newId,
      name: newName,
      status: "draft",
      version: 1,
      last_updated: now,
      created_at: now,
    });
    return newId;
  },
};
