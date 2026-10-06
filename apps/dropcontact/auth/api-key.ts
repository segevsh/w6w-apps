import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, ENRICH_PATH, parseEnvelope } from "../lib/client.ts";

/**
 * Dropcontact access token — `X-Access-Token: <token>`, applied in `sign`.
 *
 * Verified 2026-10-06 against https://developer.dropcontact.com/#authentication and live
 * probes of `api.dropcontact.com`.
 *
 * ## Probe: `POST /v1/enrich/all` with `{"data":[{}]}`
 *
 * The vendor documents it ("Credits Left"): one empty object "returns your remaining credits
 * without consuming any", as `{"error":false,"success":true,"request_id":…,"credits_left":<int>}`.
 * There is no GET whoami, so this is the cheapest signed call; the body is credits, never the
 * token. The verdict comes from the body, not the status:
 *
 * - `success: true` with a numeric `credits_left` -> good.
 * - `401 {"error":true,"reason":"Unknown account"}` -> token wrong. Measured live.
 * - `401 … "No api key received…"` -> token missing or sent in the wrong header. Measured live.
 * - `403` (documented "Token exceeded quota") -> the token is real but out of quota.
 */
export interface DropcontactCredential {
  apiKey: string;
}

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${ENRICH_PATH}`,
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ data: [{}] }),
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Access Token",
  description:
    "A Dropcontact API access token (Dropcontact account > API), sent in the X-Access-Token header.",
  connectionLabel: "Dropcontact",
  apiKey: { in: "header", name: "X-Access-Token" },
  fields: [
    {
      key: "apiKey",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Your Dropcontact API key, from your Dropcontact account's API page.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as Partial<DropcontactCredential>;
    request.headers["x-access-token"] = (key ?? "").trim();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<DropcontactCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the access token" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body as string,
    });
    const body = parseEnvelope(await res.text().catch(() => ""));
    const reason = body.reason ?? "";

    if (res.ok && body.success === true && typeof body.credits_left === "number") {
      return { ok: true };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Dropcontact rejected the access token (401${reason ? ` ${reason}` : ""}). ` +
          "Check it was copied exactly from your Dropcontact account.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Dropcontact refused the call (403${reason ? ` ${reason}` : ""}); ` +
          "the token has exceeded its quota",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Dropcontact rate-limited the token check (429); try again" };
    }
    return {
      ok: false,
      message: `Dropcontact answered HTTP ${res.status}${
        reason ? `: ${reason}` : " without the documented credits_left body"
      }`,
    };
  },
};

export default apiKey;
