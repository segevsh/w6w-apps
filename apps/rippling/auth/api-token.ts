import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Rippling API token — `Authorization: Bearer <token>`.
 *
 * Tokens are created in Rippling at Tools > Developer > API Tokens
 * (app.rippling.com/api-tokens). Each token carries the permissions of the user
 * who created it AND the scopes ticked at creation: it can only read data both
 * allow. A token is revoked when its owner is terminated or when it goes unused
 * for more than 30 days — a connection that "worked last month" and now answers
 * 401 is usually that, not a bug.
 *
 * ## Why no OAuth
 *
 * Rippling's OAuth is the App Shop flow: a partner registers a listing, and
 * each customer installs it. The authorize URL is per listing
 * (`/apps/PLATFORM/{APPNAME}/authorize`), the installation guide names a token
 * URL on a different host (`api.rippling.com/api/o/token/`) from the one in
 * the REST reference's security scheme (`app.rippling.com/o/token`), and the
 * client id/secret belong to the listing, not to a w6w user. None of that is a
 * generic third-party-app flow, so it is left out rather than guessed. Rippling's
 * own terms also say an API token must not be used on behalf of another
 * organization — connect one token per Rippling company you own.
 */

export interface RipplingCredential {
  apiToken: string;
}

export function authHeaders(credential: Partial<RipplingCredential>): Record<string, string> {
  return { authorization: `Bearer ${(credential.apiToken ?? "").trim()}` };
}

/**
 * The liveness probe: `GET /companies/?limit=1`, the call Rippling's own
 * quickstart uses. It needs the `companies.read` scope, which a narrowly scoped
 * token may legitimately lack — so a 403 whose body says the problem is a scope
 * is read as "the token authenticated", not as a dead credential.
 *
 * Measured live 2026-10-05: with no Authorization header AND with a fabricated
 * token the answer is the same `401 {"ok": false, "error": "Incorrect
 * authentication credentials."}` — missing and wrong are indistinguishable, and
 * the body never echoes anything back. `/companies/` returns the company's own
 * name and address, never the token.
 */
export const PROBE_PATH = "/companies/";

export function isScopeRefusal(status: number, error: string): boolean {
  return status === 403 && /scope/i.test(error);
}

export async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { error?: unknown; message?: unknown; detail?: unknown };
    const e = body.error ?? body.message ?? body.detail;
    return typeof e === "string" ? e : e ? JSON.stringify(e) : text.slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste an API token from Rippling > Tools > Developer > API Tokens. Tick the scopes the " +
    "workflows using this connection need (for example workers.read, users.read, " +
    "leave-requests.read-write); the token can never see more than its creator's permission " +
    "profile allows.",
  connectionLabel: "Rippling ({{companyName}})",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Shown once, at creation. Treat it as a password: a request made with it appears in " +
        "Rippling as its owner. It is revoked if the owner is terminated or it goes unused for " +
        "30 days.",
    },
  ],

  sign({ request, credential }) {
    const cred = credential as Partial<RipplingCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<RipplingCredential>;
    if (!(cred?.apiToken ?? "").trim()) {
      return { ok: false, message: "credential missing apiToken" };
    }

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    if (res.ok) return { ok: true };

    const error = await readError(res);
    if (isScopeRefusal(res.status, error)) {
      return {
        ok: true,
        message:
          "Token accepted, but it lacks the companies.read scope the check uses; actions need " +
          "their own scopes.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: "Rippling rejected the token (401). Check it was copied exactly and has not " +
          "been revoked, expired with its owner, or gone unused for 30 days." +
          (error ? ` Rippling said: ${error}` : ""),
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Rippling rate-limited the check (429); retry shortly." };
    }
    return {
      ok: false,
      message: `Rippling returned HTTP ${res.status} for ${PROBE_PATH}${error ? `: ${error}` : ""}`,
    };
  },

  /** The company name, as the connection label. Silent on any failure. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<RipplingCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { results?: Array<{ name?: string }> };
      const name = body?.results?.[0]?.name;
      return name ? { companyName: name } : {};
    } catch {
      return {};
    }
  },
};

export default apiToken;
