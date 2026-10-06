import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

export interface FormbricksCredential {
  apiKey: string;
}

/**
 * Turn a probe response into a verdict.
 *
 * Measured 2026-10-06: `GET /api/v1/management/me` with no key AND with a bogus key both
 * answer `401 {"code":"not_authenticated","message":"Not authenticated","details":
 * {"x-Api-Key":"Header not provided or API Key invalid"}}`. Other routes answer 401
 * `unauthorized` for a key that is genuine but cannot reach the resource, so the verdict
 * reads the body's `code`, not the status: `not_authenticated` is a rejected key,
 * `unauthorized`/`forbidden` is a live key.
 */
export function classifyProbe(status: number, body: unknown): { ok: boolean; message?: string } {
  const code = (body as { code?: unknown } | null)?.code;
  if (status === 200) {
    return body && typeof body === "object"
      ? { ok: true }
      : { ok: false, message: "unexpected 200 body from GET /management/me" };
  }
  if (code === "not_authenticated") {
    return { ok: false, message: "Formbricks rejected the API key (not_authenticated)." };
  }
  if (code === "unauthorized" || code === "forbidden") return { ok: true };
  if (status === 429) {
    return {
      ok: false,
      message: "Formbricks rate-limited the check (429); this says nothing about the key.",
    };
  }
  if (status >= 500) {
    return {
      ok: false,
      message: `Formbricks is erroring (${status}); this is not a verdict on the key.`,
    };
  }
  return { ok: false, message: `Formbricks returned an unexpected ${status} for GET /me.` };
}

/**
 * API key — created in Formbricks → Organization settings → API Keys. The key is shown
 * once and is bound, at creation, to the workspaces and permission level (read / write /
 * manage) you pick; it can't be widened afterwards.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Create a key in Formbricks → Organization settings → API Keys. Choose each workspace it may reach and read / write / manage per workspace; a key can only reach the workspaces added to it. The key is shown once.",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Sent as the `x-api-key` header.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as Partial<FormbricksCredential>;
    request.headers["x-api-key"] = apiKey ?? "";
    return request;
  },

  /**
   * Probe: `GET /management/me` — returns the workspace (or organization and permissions)
   * the key resolves to, never the key itself, and needs no workspace permission beyond
   * a valid key. The body is discarded.
   */
  async test({ credential }, ctx) {
    const key = ((credential as Partial<FormbricksCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/management/me`, {
        headers: { accept: "application/json", "x-api-key": key },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Formbricks API: ${e}` };
    }
    const body = await res.json().catch(() => null);
    return classifyProbe(res.status, body);
  },
};

export default apiKey;
