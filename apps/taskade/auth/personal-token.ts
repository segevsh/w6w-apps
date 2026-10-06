import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, vendorError } from "../lib/client.ts";

/**
 * Taskade Personal Access Token — `Authorization: Bearer <token>`, applied in `sign`.
 *
 * Verified 2026-10-06: the OpenAPI `securitySchemes` list `personalAccessToken`
 * (`http`, `bearer`) and `oAuthAuthorizationCode` (authorize `www.taskade.com/oauth2/authorize`,
 * token `www.taskade.com/oauth2/token`, no scopes declared). Only the token is modelled: the
 * OAuth app registration is a developer-console step with no documented self-serve scope list,
 * so a connection pastes a PAT (Settings > Developer > Personal Access Tokens).
 *
 * ## Probe: `GET /workspaces`
 *
 * Returns `{ ok: true, items: [{ id, name }] }` — workspace names, never the token — and needs
 * no scope. A missing or invalid token both answer HTTP 401
 * `{"ok":false,"code":"UNAUTHORIZED"}` (measured: no header and `Bearer bad` are byte-identical),
 * so the verdict is read from the body's `ok`/`code`, with the status only as a hint.
 */
export interface TaskadeCredential {
  accessToken: string;
}

export const PROBE_PATH = "/workspaces";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${PROBE_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const personalToken: AuthDefinition = {
  key: "personal-token",
  type: "apiKey",
  displayName: "Personal Access Token",
  description: "A Taskade Personal Access Token, sent as `Authorization: Bearer <token>`.",
  connectionLabel: "Taskade ({{user}})",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "accessToken",
      label: "Personal access token",
      type: "secret",
      required: true,
      hint: "Taskade > Settings > Developer > Personal Access Tokens > Generate New Token.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as Partial<TaskadeCredential>;
    request.headers["authorization"] = `Bearer ${(accessToken ?? "").trim()}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken: token } = credential as Partial<TaskadeCredential>;
    if (!(token ?? "").trim()) return { ok: false, message: "credential missing the access token" };

    const request = await personalToken.sign!({ request: probeRequest(), credential }, ctx);
    let res: Response;
    try {
      res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    } catch (e) {
      return { ok: false, message: `could not reach the Taskade API: ${e}` };
    }
    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }
    const err = vendorError(body);

    if (res.ok && !err) {
      const items = body as { ok?: unknown; items?: unknown } | undefined;
      return items?.ok === true && Array.isArray(items.items) ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /workspaces — not Taskade's envelope`,
      };
    }
    if (err?.code === "UNAUTHORIZED" || res.status === 401) {
      return {
        ok: false,
        message: "Taskade rejected the token (UNAUTHORIZED). Generate a Personal Access Token " +
          "under Settings > Developer.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Taskade rate-limited the token check (429); try again" };
    }
    if (res.status >= 500) {
      return { ok: false, message: `Taskade is erroring (HTTP ${res.status})` };
    }
    return {
      ok: false,
      message: `Taskade answered HTTP ${res.status}${
        err ? ` (${err.code}${err.message ? `: ${err.message}` : ""})` : ""
      } for ${PROBE_PATH}`,
    };
  },

  /** Records the first workspace name for the connection label. */
  async afterConnect({ credential }, ctx) {
    let user = "Taskade";
    try {
      const request = await personalToken.sign!({ request: probeRequest(), credential }, ctx);
      const res = await ctx.fetch(request.url, {
        method: request.method,
        headers: request.headers,
      });
      if (res.ok) {
        const body = await res.json() as { items?: Array<{ name?: string }> };
        user = body.items?.[0]?.name || user;
      }
    } catch { /* the label falls back to "Taskade" */ }
    return { user };
  },
};

export default personalToken;
