import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Housecall Pro API key — `Authorization: Token <key>`.
 *
 * Verified against `components.securitySchemes` in the vendor's OpenAPI document
 * and against `docs/authentication.md`, both fetched 2026-08-11, plus live
 * probes of `api.housecallpro.com` the same day.
 *
 * ## `Token`, not `Bearer`
 *
 * This is the detail every hand-written Housecall Pro integration gets wrong.
 * The document declares two `apiKey` schemes — `Company API Key` and
 * `Application API Key` — and both say the same thing:
 *
 *     name: Authorization
 *     type: apiKey
 *     in: header
 *     description: "Authorization Header value format [Token {api-key}]"
 *
 * and the authentication page repeats it with an example and a warning: "the
 * headers must follow these exact formats, including 'Token' or 'Bearer' at the
 * beginning of your header." `Bearer` is the **OAuth** prefix on this same API;
 * sending it with an API key is a 401 that looks exactly like a revoked key.
 *
 * ## Two kinds of key behind one scheme
 *
 * A **Company API Key** is what a Pro on the MAX/XL plan generates in their own
 * account settings. An **Application API Key** belongs to an approved
 * integration partner. They travel in the identical header, so this app collects
 * one field and lets the API decide — but the distinction is not cosmetic:
 * fourteen operations in the reference list only the Application key and OAuth
 * in their `security`, so a Pro's own key is refused there. Those actions carry
 * `PARTNER_ONLY_NOTE` in their description.
 *
 * ## Location hierarchy, not scopes
 *
 * Housecall Pro has no scope system for API keys. What a key can reach is
 * decided by *where it sits in the location hierarchy*: it reads its own
 * location and every location beneath it, never a sibling or a parent
 * (`docs/franchise.md`). That is why the probe below is `/company` — see
 * {@link PROBE_PATH}.
 */

export interface HousecallApiKeyCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(
  credential: Partial<HousecallApiKeyCredential>,
): Record<string, string> {
  return { authorization: `Token ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /company`.
 *
 * Chosen by reading the response schema and the `security` declarations, not by
 * the endpoint's name:
 *
 * **(a) It requires a credential.** Unauthenticated it answers `401` with
 * `{"message":"Unauthorized"}` — measured live on 2026-08-11, as was every other
 * path tried. Housecall Pro publishes no unauthenticated endpoint on this host,
 * so there is no ElevenLabs-`/v1/voices` trap here to fall into.
 *
 * **(b) Every credential this app accepts can reach it.** `/company` is one of
 * the 31 operations whose `security` lists all three schemes — Company API Key,
 * Application API Key and OAuth token. A probe on any of the fourteen
 * partner-only operations (`/routes`, `/service_zones`, `/checklists`, …) would
 * report a perfectly good Pro's key as broken. `docs/franchise.md` also makes
 * `/company` the endpoint the vendor tells you to call *first*.
 *
 * **(c) It returns no credential material.** The response is company profile
 * data — id, name, support email, phone, logo URL, address, website, time zone,
 * service-area zip codes, the `locations` array and `franchise_info`. There is
 * no key, no token, no secret and no password anywhere in the schema. That is
 * not the default for a whoami: Mailjet's `/apikey`, Follow Up Boss's `/me` and
 * Aircall's `/v1/webhooks` all hand back a live secret to their own caller.
 */
export const PROBE_PATH = "/company";

/**
 * Why a 401 body cannot be read as "wrong key".
 *
 * Measured 2026-08-11, four requests to `GET /company`:
 *
 *   | Credential sent                    | Status | Body                        |
 *   | ---------------------------------- | ------ | --------------------------- |
 *   | none                               | 401    | `{"message":"Unauthorized"}` |
 *   | `Token deadbeef…` (well-formed)    | 401    | `{"message":"Unauthorized"}` |
 *   | `Bearer deadbeef…`                 | 401    | `{"message":"Unauthorized"}` |
 *   | none, on `/customers`              | 401    | `{"message":"Unauthorized"}` |
 *
 * Byte-identical in all four cases. So `test` cannot distinguish "the credential
 * never reached the API" from "the API rejected it", and it says both rather
 * than picking one and being wrong half the time.
 */
export const OPAQUE_401 = "Housecall Pro returns an identical 401 body for a missing " +
  "and for a rejected credential";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Housecall Pro. A Pro on the MAX or XL plan generates one in their own " +
    "account settings; an approved integration partner is issued an Application API Key by " +
    "Housecall Pro. Both go in this field.",
  apiKey: { in: "header", name: "Authorization", prefix: "Token " },
  connectionLabel: "Housecall Pro ({{companyName}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Housecall Pro > Settings > API. Requires the MAX or XL plan. Partner integrations use " +
        "the Application API Key issued by apideveloper@housecallpro.com instead.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the header and returns. The key never appears in a URL — Housecall Pro
   * documents no query-parameter form, and a workflow host logs request URLs
   * while it does not log request headers.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<HousecallApiKeyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why `/company` and not one of the alternatives. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<HousecallApiKeyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { message?: string } | null;
    const detail = body?.message ? `: ${body.message}` : "";

    if (res.status === 401) {
      return {
        ok: false,
        message:
          `Housecall Pro answered 401${detail}. ${OPAQUE_401}, so this is either a key it does ` +
          "not recognise or a key that never reached it. Check the key was copied exactly, that " +
          "it has not been revoked, and that the account is on the MAX or XL plan — API keys are " +
          "not issued below it. Note the prefix is `Token `, not `Bearer `.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Housecall Pro refused the company read (403${detail}). The key is live but not ` +
          "entitled to this location.",
      };
    }
    return { ok: false, message: `Housecall Pro returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish the company name, and nothing else.
   *
   * A list of Connections that all read "Housecall Pro" is unusable, and the
   * company name is the one field that tells a franchise operator which location
   * a Connection belongs to. This takes two fields off `GET /company` and drops
   * the rest — the address, the zip-code service areas and the whole `locations`
   * tree never leave this function.
   *
   * A failure here is deliberately silent: `test` has already established the
   * key is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<HousecallApiKeyCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { id?: string; name?: string };
      if (!body?.name) return {};
      return body.id ? { companyName: body.name, companyId: body.id } : { companyName: body.name };
    } catch {
      return {};
    }
  },
};

export default apiKey;
