import type { HookContext, RedactedConnection } from "@w6w/types";
import { hostFor, isLocation } from "./regions.ts";

/**
 * Vertex AI REST API v1 — verified against the discovery document Google serves
 * from the API's own host (`https://aiplatform.googleapis.com/$discovery/rest?version=v1`,
 * fetched 2026-10-05, revision 20260930). Its `baseUrl` is
 * `https://aiplatform.googleapis.com/`, every path starts `v1/`, and a regional
 * call swaps the host for `{region}-aiplatform.googleapis.com`.
 */
export const API_VERSION = "v1";

/** Public (redacted-safe) connection metadata. */
export interface VertexConnectionDisplay {
  /** The Google Cloud project calls run in and are billed to. */
  projectId?: string;
  /** The default location (`global` or a region). */
  location?: string;
}

/** Ids Google mints (and model ids with an `@version` suffix) — nothing that can escape a path. */
const ID = /^[A-Za-z0-9][A-Za-z0-9_.@-]*$/;

const FULL_NAME = /^projects\/([^/]+)\/locations\/([^/]+)\/([A-Za-z]+)\/([^/]+)$/;

/** Resolve the project: the action's override wins, else the connection's. */
export function resolveProject(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  const display = (connection?.display ?? {}) as VertexConnectionDisplay;
  const project = explicit || display.projectId?.trim();
  if (!project) {
    throw new Error(
      "no Google Cloud project — set one on the connection or pass `projectId` on the action",
    );
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(project)) {
    throw new Error(`"${project}" is not a valid Google Cloud project id`);
  }
  return project;
}

/** Resolve the location: the action's override wins, else the connection's, else `us-central1`. */
export function resolveLocation(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  const display = (connection?.display ?? {}) as VertexConnectionDisplay;
  const location = explicit || display.location?.trim() || "us-central1";
  if (!isLocation(location)) {
    throw new Error(
      `unknown Vertex AI location "${location}" — use "global" or one of the supported regions`,
    );
  }
  return location;
}

/** `projects/{p}/locations/{l}` */
export function parentOf(project: string, location: string): string {
  return `projects/${project}/locations/${location}`;
}

export function assertId(value: unknown, what: string): string {
  const id = String(value ?? "").trim();
  if (!ID.test(id)) throw new Error(`\`${what}\` is empty or not a valid id: "${id}"`);
  return id;
}

/** Where a call goes: the location that picks the host, and the resource path under `/v1/`. */
export interface Target {
  location: string;
  /** e.g. `projects/p/locations/l/endpoints/1` — no leading slash, no version. */
  name: string;
}

/**
 * Turn an id (or a full resource name copied from the console / a list result)
 * into a {@link Target}. A full name carries its own project and location, and
 * those win — a name that says `europe-west4` must go to the europe-west4 host
 * whatever the connection's default is.
 */
export function resolveResource(
  connection: RedactedConnection | undefined,
  input: Record<string, unknown>,
  collection: string,
  idKey: string,
): Target {
  const raw = String(input[idKey] ?? "").trim();
  const full = FULL_NAME.exec(raw);
  if (full) {
    if (full[3] !== collection) {
      throw new Error(`\`${idKey}\` names a "${full[3]}" resource, expected "${collection}"`);
    }
    const project = resolveProject(connection, full[1]);
    const location = resolveLocation(connection, full[2]);
    return {
      location,
      name: `${parentOf(project, location)}/${collection}/${assertId(full[4], idKey)}`,
    };
  }
  const project = resolveProject(connection, input.projectId);
  const location = resolveLocation(connection, input.location);
  return { location, name: `${parentOf(project, location)}/${collection}/${assertId(raw, idKey)}` };
}

/**
 * Resolve a publisher model for generateContent / countTokens / predict. Accepts a
 * bare id (`gemini-2.5-flash`, taken to be published by `google`), `publishers/{p}/models/{m}`, or the full
 * `projects/{p}/locations/{l}/publishers/{p}/models/{m}`.
 */
export function resolvePublisherModel(
  connection: RedactedConnection | undefined,
  input: Record<string, unknown>,
): Target {
  const raw = String(input.model ?? "").trim();
  const full = /^projects\/([^/]+)\/locations\/([^/]+)\/publishers\/([^/]+)\/models\/([^/]+)$/
    .exec(raw);
  if (full) {
    const project = resolveProject(connection, full[1]);
    const location = resolveLocation(connection, full[2]);
    return {
      location,
      name: `${parentOf(project, location)}/publishers/${assertId(full[3], "publisher")}/models/${
        assertId(full[4], "model")
      }`,
    };
  }
  const short = /^publishers\/([^/]+)\/models\/([^/]+)$/.exec(raw);
  const publisher = short ? short[1] : "google";
  const model = short ? short[2] : raw;
  const project = resolveProject(connection, input.projectId);
  const location = resolveLocation(connection, input.location);
  return {
    location,
    name: `${parentOf(project, location)}/publishers/${assertId(publisher, "publisher")}/models/${
      assertId(model, "model")
    }`,
  };
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/** Google's error envelope: `{ error: { code, message, status } }`. */
export interface GoogleError {
  code?: number;
  message?: string;
  status?: string;
}

export function parseGoogleError(text: string): GoogleError {
  try {
    const body = JSON.parse(text) as { error?: GoogleError };
    return body?.error ?? {};
  } catch {
    return {};
  }
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime routes
 * every request through the auth `sign` hook. The host is derived from the
 * location, and only from the fixed list in `regions.ts`.
 */
export class VertexClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(
    location: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`https://${hostFor(location)}/${API_VERSION}/${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // `error.status` (PERMISSION_DENIED, NOT_FOUND, RESOURCE_EXHAUSTED …) is the
      // machine-readable part; the message carries the specifics.
      const detail = await res.text().catch(() => "");
      const err = parseGoogleError(detail);
      throw new Error(
        `Vertex AI ${res.status}${
          err.status ? ` ${err.status}` : ""
        } for ${init.method} ${url.pathname}: ${err.message ?? detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow `pageToken` pagination, collecting one named collection. Returns the
   * items and, when the limit stopped the walk early, the token to resume from.
   */
  async requestAll<T = unknown>(
    location: string,
    path: string,
    collectionKey: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<{ items: T[]; nextPageToken?: string }> {
    const items: T[] = [];
    let pageToken: string | undefined;
    while (items.length < wantTotal) {
      const pageSize = Math.min(100, Math.max(1, wantTotal - items.length));
      const page = await this.request<Record<string, unknown>>(location, path, {
        ...options,
        query: { ...options.query, pageSize, pageToken },
      });
      const chunk = (page?.[collectionKey] as T[] | undefined) ?? [];
      items.push(...chunk);
      pageToken = page?.nextPageToken as string | undefined;
      if (!pageToken || chunk.length === 0) break;
    }
    const capped = Number.isFinite(wantTotal) && items.length > wantTotal;
    return {
      items: capped ? items.slice(0, wantTotal) : items,
      // Items dropped by the cap mean the token no longer lines up; only offer it when none were.
      nextPageToken: capped ? undefined : pageToken,
    };
  }
}
