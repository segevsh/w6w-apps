import type { AuthDefinition } from "@w6w/types";
import { API_BASE, baseHeaders, errorText } from "../lib/client.ts";

/**
 * Everhour API key — `X-Api-Key: <key>`.
 *
 * The blueprint: "Currently, we provide only a plain authorization by an API key. You can find
 * an API key in your profile at the bottom of the page. All your requests should include
 * X-Api-Key header with valid API key." Nothing else (no OAuth, no query-string form) is
 * documented, so nothing else is offered.
 *
 * ## The probe is `GET /users/me`
 *
 * It is the whoami, needs no id, no scope and no query. Its documented schema is `User`
 * (`id`, `name`, `headline`, `avatarUrl`, `role`, `status`) — it does not return the key, which
 * is why the check can safely read it. Even so, `test` keeps only a boolean and `afterConnect`
 * keeps only `id` and `name`: the body is never stored.
 *
 * ## A rejected key cannot be told from a missing one
 *
 * Measured 2026-10-06: no header and `X-Api-Key: invalid-key` both answer
 * `403 {"code":403,"message":"Access denied"}`, byte-identical. The status is NOT the verdict:
 * a pass is a 2xx whose body is a `User` (a numeric `id`), and everything else fails with a
 * message that names both possibilities.
 */

export interface EverhourCredential {
  apiKey: string;
}

export const PROBE_PATH = "/users/me";

/** The one place the wire format is built, shared by `sign`, `test` and `afterConnect`. */
export function authHeaders(credential: Partial<EverhourCredential>): Record<string, string> {
  return { "x-api-key": (credential.apiKey ?? "").trim() };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste your Everhour API key (Everhour > My Profile, at the bottom of the page). The key " +
    "acts as its owner, so a workflow can do exactly what that user can.",
  connectionLabel: "Everhour ({{name}})",
  apiKey: { in: "header", name: "X-Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Everhour > My Profile > API Key (bottom of the page). Use a dedicated user for " +
        "automation if you can: the key carries that user's role.",
    },
  ],

  /** The only hook handed the raw credential; network-less, it stamps the header. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<EverhourCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<EverhourCredential>;
    if (!(cred?.apiKey ?? "").trim()) return { ok: false, message: "credential missing apiKey" };

    // `sign` only auto-applies to action traffic, so the header is built by hand here.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { ...baseHeaders(), ...authHeaders(cred) },
    });
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;

    if (res.ok) {
      if (body && typeof body === "object" && typeof body.id === "number") return { ok: true };
      return {
        ok: false,
        message: `Everhour answered ${res.status} but not with a user object — not the ` +
          "documented /users/me response.",
      };
    }
    const msg = errorText(body);
    if (res.status === 429) {
      return {
        ok: false,
        message: "Everhour rate-limited the check (429); the key was not judged. Retry shortly.",
      };
    }
    if (res.status === 403 || res.status === 401) {
      return {
        ok: false,
        message: `Everhour refused the key (${res.status}${msg ? ` ${msg}` : ""}). Everhour ` +
          "answers a missing and a wrong key identically, so check the key was copied exactly " +
          "and has not been regenerated in your profile.",
      };
    }
    return { ok: false, message: `Everhour returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /** Publish the user's name and id for the connection label, nothing else. */
  async afterConnect({ credential }, ctx) {
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { ...baseHeaders(), ...authHeaders(credential as Partial<EverhourCredential>) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { id?: number; name?: string };
      const out: Record<string, unknown> = {};
      if (typeof body?.name === "string") out.name = body.name;
      if (typeof body?.id === "number") out.userId = body.id;
      return out;
    } catch {
      return {};
    }
  },
};

export default apiKey;
