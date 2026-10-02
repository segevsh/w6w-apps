import type { HookContext } from "@w6w/types";

/**
 * Verified 2026-09-29 against `https://docs.granola.ai/api-reference/openapi.json`
 * (OpenAPI 3.1, `servers[0].url`) and a live probe of `public-api.granola.ai`.
 */
export const API_BASE = "https://public-api.granola.ai";
export const API_PREFIX = "/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Granola's documented error envelope, confirmed live on 2026-09-29:
 *
 *   401 `{"code":"MISSING_API_KEY","message":"Missing or invalid Authorization
 *        header. Expected: Bearer <api_key|token>", "requestId":"...", "timestamp":"..."}`
 *   401 `{"code":"INVALID_API_KEY","message":"Invalid API key format", ...}`
 *
 * A request to a path outside the declared API surface (e.g. the bare root)
 * answers a *different* shape, `{"error":"not_found","message":"..."}` — so
 * both `code` and `error` are read here rather than assuming one envelope.
 */
export interface GranolaErrorBody {
  code?: string;
  error?: string;
  message?: string;
  requestId?: string;
  timestamp?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `authorization` — the runtime
 * routes every call through the Auth `sign` hook, which injects the bearer
 * token onto the wire; an Action must never hold or set it itself.
 */
export class GranolaClient {
  constructor(private ctx: HookContext) {}

  private buildUrl(path: string, query?: RequestOptions["query"]): URL {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url;
  }

  /** Issue the request and return the raw `Response`, without an ok-check. Lets a caller branch on a specific status (e.g. Get Note's `413 TRANSCRIPT_TOO_LARGE`) before the generic error path runs. */
  async requestRaw(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    return this.ctx.fetch(url.toString(), init);
  }

  /** Turn a non-ok `Response` into a descriptive `Error`, reading Granola's own error envelope. */
  async fail(res: Response, method: string, pathname: string): Promise<never> {
    const body = await res.json().catch(() => null) as GranolaErrorBody | null;
    const detail = body?.message ?? body?.error ?? res.statusText;
    const code = body?.code ?? body?.error;
    throw new Error(
      `Granola ${res.status}${code ? ` (${code})` : ""} for ${method} ${pathname}: ${detail}`,
    );
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.requestRaw(path, options);
    if (!res.ok) {
      await this.fail(res, options.method ?? "GET", path);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

// --- shared vendor shapes ----------------------------------------------------
// Field-for-field from `components.schemas` in the OpenAPI document.

export interface GranolaUser {
  name: string | null;
  email: string;
}

export interface GranolaFolder {
  id: string;
  object: "folder";
  name: string;
  parent_folder_id: string | null;
}

export interface GranolaSpeaker {
  source: "microphone" | "speaker";
  attribution?: "me" | "them";
  diarization_label?: string;
  name?: string;
}

export interface GranolaTranscriptItem {
  speaker: GranolaSpeaker;
  text: string;
  start_time: string;
  end_time: string;
}

export interface GranolaCalendarInvitee {
  email: string;
}

export interface GranolaCalendarEvent {
  event_title: string | null;
  invitees: GranolaCalendarInvitee[];
  organiser: string | null;
  calendar_event_id: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
}

export interface GranolaNoteSummary {
  id: string;
  object: "note";
  title: string | null;
  owner: GranolaUser;
  created_at: string;
  updated_at: string;
}

export interface GranolaNote extends GranolaNoteSummary {
  web_url: string;
  calendar_event: GranolaCalendarEvent | null;
  attendees: GranolaUser[];
  folder_membership: GranolaFolder[];
  summary_text: string;
  summary_markdown: string | null;
  /** Only populated when the API key belongs to the note's owner; `null` otherwise. */
  private_notes_text: string | null;
  /** Only populated when the API key belongs to the note's owner; `null` otherwise. */
  private_notes_markdown: string | null;
  transcript: GranolaTranscriptItem[] | null;
}

export interface GranolaWebhookEndpoint {
  id: string;
  object: "webhook_endpoint";
  url: string;
  url_redacted: boolean;
  events: Array<"note.access_granted" | "note.edited" | "note.generated">;
  folder_ids: string[];
  scopes: Array<"personal" | "public" | "workspace">;
  created_by: GranolaUser | null;
  enabled: boolean;
  created_at: string;
}

export interface GranolaLegalHold {
  id: string;
  object: "legal_hold";
  name: string;
  description: string | null;
  covers_entire_workspace: boolean;
  custodian_count: number;
  created_at: string;
  released_at: string | null;
}

export interface GranolaLegalHoldCustodian {
  id: string;
  object: "legal_hold_custodian";
  user: { object: "user"; id: string; email: string | null };
  added_at: string;
  removed_at: string | null;
}

/** Input shape for naming a custodian — by email, by Granola user id, or both. */
export interface GranolaCustodianInput {
  email?: string;
  id?: string;
}
