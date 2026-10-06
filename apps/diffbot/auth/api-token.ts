import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { errorText, KG_HOST, LLM_HOST } from "../lib/client.ts";

/**
 * Diffbot API token. Verified 2026-10-06 against docs.diffbot.com/docs/authentication
 * ("All Diffbot API requests (GET and POST) are authenticated via the `token`
 * parameter") and live probes of all four hosts.
 *
 * ## Two shapes, chosen per host in `sign`
 *
 * - `api.diffbot.com`, `kg.diffbot.com`, `nl.diffbot.com`: `?token=<token>`.
 * - `llm.diffbot.com` (Web Search): `Authorization: Bearer <token>`; a `token`
 *   query parameter is ignored there (measured: the same 401 as no credential).
 *
 * No action sets either; they only name the host.
 *
 * ## Probe: a Knowledge Graph search that cannot match
 *
 * `GET /v4/account` is the obvious whoami and is NOT used: its body echoes the
 * token and every child token. Web Search is no use either: measured 2026-10-06,
 * it answers 200 with results for a made-up Bearer token. A DQL search for an
 * entity name that does not exist returns zero entities, which the vendor bills
 * at nothing ("Knowledge Graph Searches that return 0 entities do not consume
 * credits"), and its body is a result envelope, never the credential.
 *
 * The verdict is classified from the body, not the status alone:
 * - 2xx → the token is accepted;
 * - 401 with the gateway's `Unauthorized. Incorrect token.` / `Token is required.`
 *   message → rejected;
 * - 400 with the DQL `{"error":true,"message":…}` parse-error envelope → the
 *   request got past authentication, so the token is accepted;
 * - 429 → the token was not rejected, but the account is throttled or out of credits.
 */
export interface DiffbotCredential {
  token: string;
}

export const PROBE_QUERY = 'type:Organization name:"w6w connection check no such entity 0000"';

export function probeRequest(): SignableRequest {
  const url = new URL(`https://${KG_HOST}/kg/v3/dql`);
  url.searchParams.set("query", PROBE_QUERY);
  url.searchParams.set("size", "1");
  return { url: url.toString(), method: "GET", headers: { accept: "application/json" } };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description: "A Diffbot API token from the dashboard (app.diffbot.com). It is sent as the " +
    "`token` parameter on Extract, Crawl, Knowledge Graph and Natural Language calls and as a " +
    "bearer token on Web Search.",
  connectionLabel: "Diffbot",
  apiKey: { in: "query", name: "token" },
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "app.diffbot.com > your token, top right of the dashboard home. Trim stray spaces: " +
        "a rogue space is the usual cause of a 401.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as Partial<DiffbotCredential>;
    const value = (token ?? "").trim();
    const url = new URL(request.url);
    if (url.hostname === LLM_HOST) {
      request.headers["authorization"] = `Bearer ${value}`;
      return request;
    }
    url.searchParams.set("token", value);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { token } = credential as Partial<DiffbotCredential>;
    if (!(token ?? "").trim()) return { ok: false, message: "credential missing the API token" };

    const request = await apiToken.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    const text = errorText(raw);
    let parseError = false;
    try {
      const p = JSON.parse(raw) as { error?: unknown; message?: unknown };
      parseError = res.status === 400 && p.error === true && typeof p.message === "string";
    } catch { /* not JSON */ }
    if (parseError) return { ok: true };

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Diffbot rejected the API token (${res.status}${text ? ` ${text}` : ""}). ` +
          "Check it was copied exactly from app.diffbot.com with no trailing space.",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message: "Diffbot answered 429 to the token check: rate limit hit or credits exhausted; " +
          "the token itself was not rejected",
      };
    }
    return {
      ok: false,
      message: `Diffbot answered HTTP ${res.status}${text ? `: ${text}` : ""} for the token check`,
    };
  },
};

export default apiToken;
