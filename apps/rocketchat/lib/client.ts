/**
 * Rocket.Chat REST API — verified 2026-10-06 against the vendor's own OpenAPI documents
 * (github.com/RocketChat/Rocket.Chat-Open-API: `authentication`, `messaging`, `rooms`,
 * `user-management`) and one unauthenticated probe of the public workspace open.rocket.chat
 * (server 8.10) to read the real error envelope.
 *
 * Things about this API that fail quietly:
 *
 * ## 1. The host is per-workspace
 *
 * Every Rocket.Chat Cloud workspace is `<name>.rocket.chat`. The spec's `servers` block is the
 * docs sandbox (`apiexplorer.support.rocket.chat`) and is NOT a production host. The workspace
 * is a property of the CONNECTION: collected as an Auth field, republished by `afterConnect` as
 * `connection.display.workspace`, and turned into a base URL here. The manifest declares the
 * narrow wildcard `*.rocket.chat`. Self-hosted servers (any other domain) and Cloud workspaces on
 * a custom domain are NOT reachable by that allowlist and are out of scope.
 *
 * ## 2. Authentication is two headers, and `X-User-Id` is mandatory
 *
 * `X-Auth-Token` + `X-User-Id` (a Personal Access Token and the user id it was issued to). The
 * token alone is rejected with 401 — the pair identifies the session.
 *
 * ## 3. Errors
 *
 * Failures answer `{"success": false, "error": "...", "errorType": "..."}`, and an unauthenticated
 * call answers 401 `{"success": false, "error": "You must be logged in to do this.", "status":
 * "error", "message": "..."}`. Both `error` and `message` are read.
 *
 * ## 4. `query` / `fields` are deprecated
 *
 * The list endpoints accept a raw MongoDB `query` and `fields` JSON; the spec calls `query`
 * "unsafe and deprecated", and servers may refuse both unless
 * `ALLOW_UNSAFE_QUERY_AND_FIELDS_API_PARAMS` is set. This app exposes neither.
 */
import type { HookContext, Param } from "@w6w/types";

/** The only apex this app talks to. Cloud workspaces are `<name>.rocket.chat`. */
export const ROCKETCHAT_DOMAIN = "rocket.chat";
export const API_PATH = "/api/v1";

export interface RocketChatDisplay {
  workspace?: string;
  username?: string;
  name?: string;
}

/** Accepts `acme`, `acme.rocket.chat`, or `https://acme.rocket.chat/home`. */
export function normalizeWorkspace(raw: unknown): string {
  let sub = String(raw ?? "").trim().toLowerCase();
  sub = sub.replace(/^https?:\/\//, "");
  sub = sub.replace(/[/?#:].*$/, "");
  sub = sub.replace(/\.rocket\.chat$/, "");
  return sub.replace(/^\.+|\.+$/g, "");
}

export function isValidWorkspace(sub: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub);
}

export function apiHost(workspace: unknown): string {
  const sub = normalizeWorkspace(workspace);
  if (!sub) throw new Error("Rocket.Chat connection is missing a workspace");
  if (!isValidWorkspace(sub)) {
    throw new Error(
      `"${sub}" is not a Rocket.Chat Cloud workspace — expected a single label such as \`acme\` ` +
        "(the part before `.rocket.chat`). Self-hosted servers are not supported.",
    );
  }
  return `${sub}.${ROCKETCHAT_DOMAIN}`;
}

export function resolveApiUrl(display: RocketChatDisplay | undefined): string {
  return `https://${apiHost(display?.workspace)}${API_PATH}`;
}

/** The vendor's own message from an error body, whichever of its two fields carries it. */
export function errorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const b = body as { error?: unknown; message?: unknown };
  return String(b.error ?? b.message ?? "");
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

export class RocketChatClient {
  constructor(private ctx: HookContext) {}

  async request<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const base = resolveApiUrl(this.ctx.connection?.display as RocketChatDisplay | undefined);
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }
    const failedBody = (parsed as { success?: unknown } | undefined)?.success === false;
    if (!res.ok || failedBody) {
      const detail = errorMessage(parsed) || text.slice(0, 200);
      throw new Error(`Rocket.Chat ${res.status} for ${method} ${url.pathname}: ${detail}`);
    }
    if (parsed === undefined) {
      throw new Error(`Rocket.Chat ${res.status} for ${method} ${url.pathname}: non-JSON body`);
    }
    return parsed as T;
  }
}

export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as Partial<T>;
}

/** A `json` param may arrive as a value or as a JSON string; return the value. */
export function jsonValue(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` must be valid JSON`);
  }
}

/** Rooms are addressed by id OR name (`roomName`) on the read endpoints; one is required. */
export function requireRoom(input: { roomId?: string; roomName?: string }): void {
  if (!input.roomId && !input.roomName) throw new Error("Provide a Room ID or a Room name");
}

export const COUNT_PARAM: Param = {
  key: "count",
  label: "Count",
  type: "number",
  hint: "Items to return. Rocket.Chat caps this per request (100 by default on most servers).",
};
export const OFFSET_PARAM: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  hint: "Items to skip, for paging with `count`.",
};
export const SORT_PARAM: Param = {
  key: "sort",
  label: "Sort",
  type: "string",
  placeholder: '{"name": 1}',
  hint: "A JSON object of field to direction, `1` ascending or `-1` descending.",
};
export const ROOM_ID_PARAM: Param = {
  key: "roomId",
  label: "Room ID",
  type: "string",
  hint: "The room's `_id`. Required unless a Room name is given.",
};
export const ROOM_NAME_PARAM: Param = {
  key: "roomName",
  label: "Room name",
  type: "string",
  hint: "The room's name, without a leading `#`. Used when no Room ID is given.",
};
export const LATEST_PARAM: Param = {
  key: "latest",
  label: "Latest",
  type: "string",
  placeholder: "2026-10-01T00:00:00.000Z",
  hint: "End of the time range (ISO 8601). Defaults to now.",
};
export const OLDEST_PARAM: Param = {
  key: "oldest",
  label: "Oldest",
  type: "string",
  placeholder: "2026-09-01T00:00:00.000Z",
  hint: "Start of the time range (ISO 8601).",
};
