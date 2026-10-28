import type { HookContext } from "@w6w/types";

/**
 * Google Chat API v1.
 *
 * The discovery document (`$discovery/rest?version=v1`, revision 20260728)
 * gives `rootUrl: "https://chat.googleapis.com/"`, an empty `servicePath`, and
 * method paths that all begin `v1/…` — so the full base is host + `/v1`.
 * Verified against https://developers.google.com/workspace/chat/api/reference/rest.
 */
export const API_URL = "https://chat.googleapis.com/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON object → JSON-encoded body. `undefined`/`null` → no body. */
  body?: unknown;
  /** Additional request headers. */
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is applied by the runtime through the
 * auth `sign` hook, so we never touch the Authorization header here.
 */
export class GoogleChatClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: BodyInit | undefined;
    if (options.body !== undefined && options.body !== null) {
      headers["content-type"] = "application/json";
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const init: RequestInit = { method: options.method ?? "GET", headers, body };
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Google Chat ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    // `spaces.delete`, `spaces.messages.delete` and `…reactions.delete` all
    // return the `Empty` message. Read as text first so an empty 200 is as safe
    // as a 204.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

// -------------------------------------------------------------- resource names

/**
 * Percent-encode one path segment.
 *
 * `@` is restored afterwards because a membership id may legitimately be a
 * user's email address (`spaces/{space}/members/user@example.com` is documented
 * as an alias on `spaces.members.get`/`delete`), and `@` is a legal sub-delimiter
 * inside a path segment. Google's own `{+name}` reserved expansion leaves it
 * literal, so encoding it would change the URL Google's routing sees.
 */
function encodeSegment(value: string): string {
  return encodeURIComponent(value).replaceAll("%40", "@");
}

/** Validate one id: non-empty and a single segment. Returns it verbatim. */
function rawSegment(value: string | undefined, what: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(`Google Chat: ${what} is required`);
  if (v.includes("/")) {
    throw new Error(`Google Chat: ${what} must be a single path segment, got "${v}"`);
  }
  return v;
}

/** Validate, then percent-encode for use inside a URL path. */
function segment(value: string | undefined, what: string): string {
  return encodeSegment(rawSegment(value, what));
}

/**
 * Split a candidate full resource name into its ordered ids, or `null` if it is
 * not one. `["spaces", "messages"]` matches `spaces/{space}/messages/{message}`.
 */
function parseName(value: string, collections: string[]): string[] | null {
  const parts = value.trim().split("/");
  if (parts.length !== collections.length * 2) return null;
  const ids: string[] = [];
  for (let i = 0; i < collections.length; i++) {
    if (parts[i * 2] !== collections[i]) return null;
    if (!parts[i * 2 + 1]) return null;
    ids.push(parts[i * 2 + 1]);
  }
  return ids;
}

/**
 * `spaces/{space}`.
 *
 * Accepts either the bare id (`AAAAAAAAAAA`) or the full resource name
 * (`spaces/AAAAAAAAAAA`) — the latter is what every Chat response puts in
 * `name`, and what a user copies out of a space URL, so both have to work.
 *
 * `spaces/-` is a real value: `spaces.messages.search` uses it to mean "every
 * space the user can see". It survives unchanged.
 */
export function spaceName(space: string): string {
  const raw = (space ?? "").trim();
  const parsed = parseName(raw, ["spaces"]);
  return `spaces/${segment(parsed ? parsed[0] : raw, "space id")}`;
}

/** `spaces/{space}/messages/{message}`. A full name in `message` wins over `space`. */
export function messageName(space: string, message: string): string {
  const raw = (message ?? "").trim();
  const full = parseName(raw, ["spaces", "messages"]);
  if (full) {
    return `spaces/${segment(full[0], "space id")}/messages/${segment(full[1], "message id")}`;
  }
  return `${spaceName(space)}/messages/${segment(raw, "message id")}`;
}

/** `spaces/{space}/members/{member}`. A full name in `member` wins over `space`. */
export function membershipName(space: string, member: string): string {
  const raw = (member ?? "").trim();
  const full = parseName(raw, ["spaces", "members"]);
  if (full) {
    return `spaces/${segment(full[0], "space id")}/members/${segment(full[1], "member id")}`;
  }
  return `${spaceName(space)}/members/${segment(raw, "member id")}`;
}

/** `spaces/{space}/messages/{message}/reactions/{reaction}`. A full name in `reaction` wins. */
export function reactionName(space: string, message: string, reaction: string): string {
  const raw = (reaction ?? "").trim();
  const full = parseName(raw, ["spaces", "messages", "reactions"]);
  if (full) {
    return `spaces/${segment(full[0], "space id")}/messages/${
      segment(full[1], "message id")
    }/reactions/${segment(full[2], "reaction id")}`;
  }
  return `${messageName(space, message)}/reactions/${segment(raw, "reaction id")}`;
}

/**
 * `spaces/{space}/threads/{thread}`.
 *
 * Like `userName`, this is validated but **not** percent-encoded: a thread
 * resource name only ever travels in a JSON request body here
 * (`Message.thread.name` on `spaces.messages.create`), never in a URL path.
 */
export function threadName(space: string, thread: string): string {
  const raw = (thread ?? "").trim();
  const full = parseName(raw, ["spaces", "threads"]);
  if (full) {
    return `spaces/${rawSegment(full[0], "space id")}/threads/${rawSegment(full[1], "thread id")}`;
  }
  const parsedSpace = parseName((space ?? "").trim(), ["spaces"]);
  const spaceId = rawSegment(parsedSpace ? parsedSpace[0] : space, "space id");
  return `spaces/${spaceId}/threads/${rawSegment(raw, "thread id")}`;
}

/**
 * `users/{user}` — `{user}` is the People API person id or the Directory API
 * user id.
 *
 * Deliberately **not** percent-encoded: in this app a user resource name only
 * ever lands in a query parameter (`spaces:findDirectMessage?name=…`, where
 * `URLSearchParams` does its own encoding) or in a JSON request body
 * (`spaces:setup`'s memberships). Encoding here would double-encode in the first
 * case and corrupt the value in the second. It is still validated as a single
 * segment so a caller cannot smuggle extra path structure into either.
 */
export function userName(user: string): string {
  const raw = (user ?? "").trim();
  const parsed = parseName(raw, ["users"]);
  return `users/${rawSegment(parsed ? parsed[0] : raw, "user id")}`;
}
