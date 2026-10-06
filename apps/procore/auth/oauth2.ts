import type { AuthDefinition } from "@w6w/types";
import { COMPANY_HEADER, PRODUCTION_API, SANDBOX_API } from "../lib/client.ts";

export type Environment = "production" | "sandbox";

const ENV = {
  production: { api: PRODUCTION_API, login: "https://login.procore.com" },
  sandbox: { api: SANDBOX_API, login: "https://login-sandbox.procore.com" },
} as const;

/** Endpoints that take no company header (Procore's own list: `me` and `companies`). */
const NO_COMPANY_PATHS = new Set(["/rest/v1.0/me", "/rest/v1.0/companies"]);

interface Me {
  id?: number;
  login?: string;
  name?: string;
}

/** The credential check: a numeric `id` in the body is the only pass. */
function isMe(body: unknown): body is Me {
  return typeof body === "object" && body !== null &&
    typeof (body as Me).id === "number";
}

/**
 * OAuth 2.0 authorization-code flow against Procore.
 *
 * Verified live on 2026-10-06:
 *   - `POST {login}/oauth/token` answers `401 {"error":"invalid_client", ...}` to
 *     an unknown client on both `login.procore.com` and `login-sandbox.procore.com`,
 *     so the token endpoint is real (not an SPA shell).
 *   - `GET {login}/oauth/authorize` redirects (302) to the Procore login page.
 *   - There is no `scope` parameter: what a token can do is whatever the signed-in
 *     user's Procore permissions allow, so `scopes` is empty.
 *   - Refresh uses the same token endpoint (`grant_type=refresh_token`).
 *
 * Production and sandbox are separate Procore systems with separate accounts and
 * separate app registrations, and the environment has to be fixed before the
 * browser redirect, so there is one auth method per environment.
 *
 * The credential check is `GET /rest/v1.0/me`: it returns only the caller's
 * `id`, `login` (email) and `name` — never the token — and is one of the two
 * endpoints that need no `Procore-Company-Id` header, so it works before a
 * company is chosen.
 */
export function createProcoreOAuth(environment: Environment): AuthDefinition {
  const { api, login } = ENV[environment];
  const sandbox = environment === "sandbox";

  return {
    key: sandbox ? "oauth2-sandbox" : "oauth2",
    type: "oauth2",
    displayName: sandbox ? "OAuth (Procore Sandbox)" : "OAuth (Procore)",
    description: sandbox
      ? "Procore sandbox (login-sandbox.procore.com / sandbox.procore.com). Requires an app " +
        "registered at developers.procore.com against the sandbox."
      : "Procore production (login.procore.com / api.procore.com). Requires an app registered " +
        "at developers.procore.com with a matching redirect URI.",
    connectionLabel: "{{user.name}} ({{companyName}})",
    fields: [
      {
        key: "companyId",
        label: "Default company ID",
        type: "number",
        validation: { integer: true, min: 1 },
        hint: "Sent as the `Procore-Company-Id` header on every call (Procore requires it on all " +
          "but `me` and the company list). Optional here: each action also takes a Company ID. " +
          "Find yours with the List Companies action or in the Procore URL " +
          "(app.procore.com/<company id>/...).",
      },
    ],
    oauth2: {
      authorizationUrl: `${login}/oauth/authorize`,
      tokenUrl: `${login}/oauth/token`,
      refreshUrl: `${login}/oauth/token`,
      scopes: [],
      pkce: false,
    },

    sign({ request, credential }) {
      const { accessToken, companyId } = credential as {
        accessToken: string;
        companyId?: number | string;
      };
      request.headers["authorization"] = `Bearer ${accessToken}`;
      const has = Object.keys(request.headers).some((k) =>
        k.toLowerCase() === "procore-company-id"
      );
      let path = "";
      try {
        path = new URL(request.url).pathname;
      } catch { /* leave empty */ }
      const id = Number(companyId);
      if (!has && Number.isInteger(id) && id > 0 && !NO_COMPANY_PATHS.has(path)) {
        request.headers[COMPANY_HEADER] = String(id);
      }
      return request;
    },

    async test({ credential }, ctx) {
      const { accessToken } = credential as { accessToken?: string };
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };
      const res = await ctx.fetch(`${api}/rest/v1.0/me`, {
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      });
      const body = await res.json().catch(() => undefined) as unknown;
      if (isMe(body)) return { ok: true };
      // Procore answers a rejected token with 401 and either `{"error": ...}` or
      // `{"errors": ...}`; surface its own words rather than just the status.
      const text = typeof body === "object" && body !== null
        ? String(
          (body as { error?: unknown; errors?: unknown }).error ??
            (body as { errors?: unknown }).errors ?? "",
        )
        : "";
      return {
        ok: false,
        message: `Procore rejected the token (HTTP ${res.status})${text ? `: ${text}` : ""}`,
      };
    },

    /**
     * Records the facts every action needs: which API host this connection talks
     * to (production vs sandbox), the default company, and the user.
     */
    async afterConnect({ credential }, ctx) {
      const { accessToken, companyId } = credential as {
        accessToken?: string;
        companyId?: number | string;
      };
      const display: Record<string, unknown> = {
        environment,
        apiBase: api,
      };
      if (!accessToken) return display;
      const headers = { authorization: `Bearer ${accessToken}`, accept: "application/json" };

      const meRes = await ctx.fetch(`${api}/rest/v1.0/me`, { headers });
      const me = await meRes.json().catch(() => undefined) as unknown;
      if (isMe(me)) display.user = { id: me.id, name: me.name, email: me.login };

      const id = Number(companyId);
      if (Number.isInteger(id) && id > 0) {
        display.companyId = id;
        // Best effort: label the connection with the company's name.
        const cRes = await ctx.fetch(`${api}/rest/v1.0/companies`, { headers });
        const companies = await cRes.json().catch(() => undefined) as unknown;
        if (Array.isArray(companies)) {
          const match = companies.find((c: { id?: number }) => c?.id === id) as
            | { name?: string }
            | undefined;
          if (match?.name) display.companyName = match.name;
        }
      }
      if (display.companyName === undefined) display.companyName = "no default company";
      return display;
    },
  };
}

export default createProcoreOAuth("production");
