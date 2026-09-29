/**
 * REST client for Otter.ai's Public API.
 *
 * Docs: help.otter.ai "Otter.ai Public API" (Zendesk article `36130822688279`).
 * The rendered HTML page 403s to every User-Agent tried — including a full
 * desktop browser string — so it was read via Zendesk's own Help Center JSON
 * API instead: `GET help.otter.ai/api/v2/help_center/en-us/articles/36130822688279.json`,
 * confirmed live 2026-09-29, no auth required. `article.body` is the same
 * documentation the gated page would have shown.
 *
 * ## Enterprise-only
 * "Otter's Public API is available for all Enterprise workspaces. If you do
 * not see this feature for your workspace, contact your Otter account
 * manager." A Free/Pro/Business key has no access to anything this app calls.
 *
 * ## Base URL and auth
 * Every endpoint lives under `https://api.otter.ai/v1`. Every request carries
 * `Authorization: Bearer <API key>` (docs section "Authentication"); keys are
 * minted at Otter.ai > Integrations > Developer tab, capped at 2 per user, and
 * shown only once at creation.
 *
 * ## Errors
 * Live-probed 2026-09-29 against `api.otter.ai/v1/workspace` and
 * `/v1/channels`: an unauthenticated OR a syntactically-plausible-but-wrong
 * bearer both answer `401` with body `{"error": "unauthorized"}`; an unknown
 * path answers `404` with `{"error": "not_found"}`. Both are the same plain
 * `{ error: string }` envelope — the docs name no richer error-code taxonomy,
 * so `formatOtterError` surfaces that one field verbatim rather than
 * inventing a mapping the vendor never documented.
 *
 * ## Pagination
 * List endpoints answer `{ meta: { retrieved_at, has_more, next_cursor },
 * data: [...] }`; page forward by passing the previous response's
 * `meta.next_cursor` as the next request's `cursor` query parameter, until
 * `has_more` is `false`.
 *
 * ## Rate limits
 * Documented at 10 requests/second for Enterprise plans, enforced with a bare
 * `429 Too Many Requests`. No `X-RateLimit-*` (or any other rate-limit)
 * response header was present on any live response measured 2026-09-29 —
 * see `health/quota.ts` for why that makes headroom a declared absence
 * rather than a probe.
 */
import type { HookContext } from "@w6w/types";

/** The whole API. One host, one version prefix, no per-tenant subdomain. */
export const API_BASE = "https://api.otter.ai/v1";

/** Shared by every list/get response. `has_more`/`next_cursor` only appear on list endpoints. */
export interface OtterMeta {
  retrieved_at?: string;
  has_more?: boolean;
  next_cursor?: string;
}

export interface OtterUser {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface OtterChannel {
  id: string;
  name: string;
  member_count?: number;
  owner?: OtterUser;
  /** `"private"` or `"workspace"` (public), per the docs' Channel object table. */
  discoverability?: string;
}

export interface OtterProcessStatus {
  abstract_summary?: string | null;
  action_item?: string | null;
  outline?: string | null;
}

export interface OtterSharedEmail {
  email: string;
  user?: OtterUser;
  permission?: string;
}

export interface OtterSharedChannel {
  channel: OtterChannel;
  permission?: string;
}

export interface OtterActionItemStatus {
  completed?: boolean;
  created_at?: string;
  last_modified_at?: string;
  completed_at?: string;
}

export interface OtterActionItem {
  id: string;
  text: string;
  assignee?: OtterUser;
  status?: OtterActionItemStatus | null;
}

export interface OtterInsight {
  topic: string;
  /** The docs' own example nests one array inside another for this field. */
  text: string[] | string[][];
}

export interface OtterOutlineSection {
  section: string;
  text: string[];
}

export interface OtterTranscript {
  content: string;
  format: string;
}

export interface OtterCustomPrompt {
  label: string;
  output: string;
}

/** Populated only for the fields named in a request's `include` parameter. */
export interface OtterConversationRelationships {
  action_items?: OtterActionItem[];
  insights?: OtterInsight[];
  outline?: OtterOutlineSection[];
  transcript?: OtterTranscript;
  custom_prompt?: OtterCustomPrompt | null;
}

export interface OtterConversation {
  id: string;
  title: string;
  url?: string;
  owner?: OtterUser;
  created_at?: string;
  process_status?: OtterProcessStatus;
  calendar_guests?: Array<{ name?: string; email?: string }> | null;
  shared_emails?: OtterSharedEmail[];
  shared_channels?: OtterSharedChannel[];
  abstract_summary?: string;
  conf_join_url?: string;
  relationships?: OtterConversationRelationships;
}

export interface OtterWorkspace {
  id: number;
  name: string;
  owner?: OtterUser;
  member_count?: number;
  handle?: string;
  type?: string;
}

interface OtterErrorBody {
  error?: string;
}

/** Render `{ error }` into one line — the only field the vendor documents. */
export function formatOtterError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: OtterErrorBody | null = null;
  try {
    parsed = raw ? JSON.parse(raw) as OtterErrorBody : null;
  } catch {
    // not JSON — fall through to the raw body
  }
  const code = parsed?.error;
  return code
    ? `Otter ${status} ${code} for ${method} ${path}`
    : `Otter ${status} for ${method} ${path}: ${raw || "(empty body)"}`;
}

export type QueryValue = string | number | boolean | undefined;

/**
 * Thin REST client over `ctx.fetch`.
 *
 * Never sets `Authorization` itself — the runtime routes every request
 * through the Auth `sign` hook, the only code handed the credential.
 */
export class OtterClient {
  constructor(private ctx: HookContext) {}

  get<T>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
    return this.send<T>("GET", path, query);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.send<T>("POST", path, undefined, body);
  }

  private async send<T>(
    method: string,
    path: string,
    query?: Record<string, QueryValue>,
    body?: unknown,
  ): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) throw new Error(formatOtterError(res.status, method, url.pathname, text));
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
