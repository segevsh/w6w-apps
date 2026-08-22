import type { AuthDefinition } from "@w6w/types";
import {
  API_VERSION,
  AUTHORIZE_PATH,
  type Environment,
  hostFor,
  TOKEN_PATH,
} from "../lib/client.ts";

/**
 * Authorization Code Grant against Gusto's OAuth service.
 *
 * Verified 2026-08-18 against Gusto's own hosts and documentation:
 *
 *   - `GET {host}/oauth/authorize` answers `302` on both `api.gusto.com` and
 *     `api.gusto-demo.com`, and `POST {host}/oauth/token` answers `400` to a
 *     malformed grant — both routes exist on both environments.
 *   - A `401` carries `www-authenticate: Bearer realm="Doorkeeper"`, which is
 *     the Rails OAuth provider Gusto runs; the token goes in an ordinary
 *     `Authorization: Bearer` header.
 *
 * ## The refresh token is single-use, and that is the operational risk
 *
 * Gusto's own documentation is explicit: an **access token lives 2 hours** and
 * a **refresh token is invalid after one use**. Every refresh returns a *new*
 * refresh token, and if that new one is not persisted the connection is dead —
 * there is no second chance and no way to re-derive it without sending the user
 * back through the browser.
 *
 * That is a host responsibility rather than something this app can enforce, so
 * `refreshUrl` is declared and the behaviour is documented loudly here and in
 * the README. It is also why a `401` from this app says "the refresh did not
 * happen" rather than "your token is wrong": after two hours, that is nearly
 * always what a 401 means.
 *
 * ## No `scopes` are requested
 *
 * Gusto's App Integrations OAuth flow does not take a `scope` parameter — an
 * application's permissions are configured on the developer app in Gusto's
 * portal and granted wholesale at authorization. Listing scopes here would send
 * a parameter Gusto does not read, and would imply this app can narrow its own
 * access when it cannot. What the token can reach is settled when the app is
 * registered, and `token-info` is how a workflow finds out.
 *
 * ## Production and demo are separate installations
 *
 * Different accounts, different developer apps, different credentials, and
 * nothing created in one is visible in the other. The environment has to be
 * settled *before* the browser redirect, and `OAuth2Config.authorizationUrl` is
 * a static string in this spec — so it is a second auth method rather than a
 * form field, exactly as this pack's `docusign` app does.
 */
export function createGustoOAuth(environment: Environment): AuthDefinition {
  const host = hostFor(environment);
  const isDemo = environment === "demo";

  return {
    key: isDemo ? "oauth2-demo" : "oauth2",
    type: "oauth2",
    displayName: isDemo ? "OAuth (Demo)" : "OAuth (Production)",
    description: isDemo
      ? "Gusto's demo environment (api.gusto-demo.com) — its own accounts and its own developer " +
        "app. Nothing here is visible in production."
      : "Gusto production (api.gusto.com). Requires a developer app registered with a matching " +
        "redirect URI; its configured permissions decide what the token can reach.",
    connectionLabel: "{{companyName}} ({{environment}})",
    fields: [
      {
        key: "companyId",
        label: "Company ID",
        type: "string",
        hint: "Optional. Leave blank to use the only company the token reaches. Set it when the " +
          "authorising user administers several — `token-info` lists them.",
      },
    ],
    oauth2: {
      authorizationUrl: `${host}${AUTHORIZE_PATH}`,
      tokenUrl: `${host}${TOKEN_PATH}`,
      // The same endpoint takes grant_type=refresh_token — and hands back a NEW
      // refresh token that must replace the old one, which is single-use.
      refreshUrl: `${host}${TOKEN_PATH}`,
      pkce: true,
    },

    sign({ request, credential }) {
      const { accessToken } = credential as { accessToken: string };
      request.headers["authorization"] = `Bearer ${accessToken}`;
      return request;
    },

    /**
     * `GET /v1/token_info` — Gusto's own introspection route.
     *
     * The right probe because it is the one call that needs no company id and
     * no particular permission: it describes the token itself, including which
     * companies it reaches. A read of any business resource would report a
     * missing permission as a broken connection.
     */
    async test({ credential }, ctx) {
      const { accessToken } = credential as { accessToken?: string };
      if (!accessToken) return { ok: false, message: "credential has no accessToken" };

      const res = await ctx.fetch(`${host}/v1/token_info`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
          "x-gusto-api-version": API_VERSION,
        },
      });
      if (res.status === 401) {
        await res.body?.cancel();
        return {
          ok: false,
          message:
            "Gusto rejected the access token — they live two hours, so this usually means the " +
            "refresh did not happen (and Gusto's refresh tokens are single-use, so a missed " +
            "rotation ends the connection)",
        };
      }
      if (!res.ok) {
        await res.body?.cancel();
        return { ok: false, message: `Gusto ${host}/v1/token_info returned ${res.status}` };
      }
      const info = await res.json().catch(() => ({})) as { resource?: { type?: string } };
      return {
        ok: true,
        message: info?.resource?.type ? `token scoped to ${info.resource.type}` : undefined,
      };
    },

    /**
     * Record the environment and the company this Connection acts on.
     *
     * The company id is what every business route needs, and a token usually
     * reaches exactly one — so resolving it once here saves every action from
     * asking for it.
     */
    async afterConnect({ credential }, ctx) {
      const { accessToken, companyId } = credential as {
        accessToken?: string;
        companyId?: string;
      };
      if (!accessToken) return { environment };

      const headers = {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
        "x-gusto-api-version": API_VERSION,
      };
      const res = await ctx.fetch(`${host}/v1/token_info`, { headers });
      if (!res.ok) {
        await res.body?.cancel();
        return { environment, companyId };
      }
      const info = await res.json().catch(() => ({})) as {
        resource?: { type?: string; uuid?: string };
        companies?: Array<{ uuid?: string; name?: string }>;
      };

      // Gusto reports the token's companies here; an explicit id wins so a
      // multi-company administrator can choose.
      const companies = info?.companies ?? [];
      const chosen = companyId
        ? companies.find((c) => c.uuid === companyId) ?? { uuid: companyId, name: undefined }
        : companies[0] ?? { uuid: info?.resource?.uuid, name: undefined };

      return {
        environment,
        companyId: chosen?.uuid,
        companyName: chosen?.name ?? chosen?.uuid,
        companyCount: companies.length,
      };
    },
  };
}

export default createGustoOAuth("production");
