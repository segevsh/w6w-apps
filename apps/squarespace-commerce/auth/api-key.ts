import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_V1, USER_AGENT } from "../lib/client.ts";

/**
 * Squarespace Commerce API key — `Authorization: Bearer <API_KEY>`.
 *
 * ## API key only, and why
 *
 * The vendor documents two ways in: an **API key**, generated in the merchant's
 * Squarespace settings and tied to one website, and **OAuth**, which exists only
 * for registered Squarespace Extensions. This app implements the API key — the
 * always-available mode for a website you own — and declares no OAuth method at
 * all, because there is nothing for a user to register here.
 *
 * The scheme is `http`/`bearer` with `bearerFormat` unset on every operation's
 * own `security` block, and the header's default value in the reference pages is
 * literally `Bearer YOUR_API_KEY_OR_OAUTH_TOKEN`.
 *
 * ## The probe: `GET /1.0/authorization/website`
 *
 * It is the same read users get as `get-website-profile`, and it is the right
 * probe for three reasons verified live on 2026-09-22:
 *
 *  - **It requires the credential.** With no `Authorization` header it answers
 *    `401 {"type":"AUTHORIZATION_ERROR",…}`; it is not a public endpoint that
 *    would pass with the key missing.
 *  - **Its 200 body carries no credential material.** The response is a
 *    `WebsiteProfile` (`id`, `title`, `url`, `currency`, `language`, `timeZone`,
 *    `location`, `measurementStandard`, `siteId`) — the key is never echoed,
 *    which is what makes it safe to store and display a probe result forever.
 *  - **It is not scope-sensitive.** A website profile is account metadata, so a
 *    key that can do nothing else still reaches it.
 *
 * ## Classification is by body, never by status alone
 *
 * A rejected key answers `401` with `{"type":"AUTHORIZATION_ERROR","subtype":null,
 * "message":"You are not authorized to do that.","details":null,"contextId":"…"}`.
 * The `test` hook below reads that `type` first and only *then* falls back to
 * the status, and its message never quotes the key.
 */
export interface SquarespaceCredential {
  /** The website's API key, sent as `Authorization: Bearer <key>`. */
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same header `sign` sends — a hand-rolled second copy is how a
 * probe ends up sending something the real requests do not.
 */
export function authHeaders(apiKey: string): Record<string, string> {
  return { authorization: `Bearer ${apiKey}` };
}

/** The credential-liveness probe. See this file's header for why this endpoint. */
export const PROBE_PATH = `${API_V1}/authorization/website`;

/** Every request needs it; the vendor marks the header `required` on all ops. */
export function probeHeaders(apiKey: string): Record<string, string> {
  return {
    accept: "application/json",
    "user-agent": USER_AGENT,
    ...authHeaders(apiKey),
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "An API key generated in your Squarespace website settings. It is tied to that one website " +
    "and sent as a bearer token.",
  connectionLabel: "{{siteTitle}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Squarespace → Settings → Developer Tools → API Keys, on the website you want this " +
        "connection to read and write. The key belongs to one website only.",
    },
  ],

  /** Network-less: stamps the bearer header and returns. The key never appears in a URL. */
  sign({ request, credential }) {
    const cred = credential as Partial<SquarespaceCredential>;
    for (const [name, value] of Object.entries(authHeaders(String(cred?.apiKey ?? "").trim()))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Fetch the website profile. Success is the body being a profile; failure is
   * the vendor's own `AUTHORIZATION_ERROR` body — the status only ever
   * corroborates it.
   */
  async test({ credential }, ctx) {
    const key = String((credential as Partial<SquarespaceCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, { headers: probeHeaders(key) });
    const raw = await res.text().catch(() => "");

    if (res.ok) {
      // A 200 is only trusted when it really carries a profile — a captive
      // portal or a rewritten host can answer 200 with something else entirely.
      let body: unknown;
      try {
        body = raw ? JSON.parse(raw) : undefined;
      } catch {
        body = undefined;
      }
      if (body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string") {
        return { ok: true };
      }
      return {
        ok: false,
        message: `Squarespace answered ${res.status} but not with a website profile — the ` +
          "response is not the documented shape",
      };
    }

    let err: {
      type?: string;
      subtype?: string | null;
      message?: string;
      contextId?: string;
    } = {};
    try {
      err = raw ? JSON.parse(raw) : {};
    } catch {
      err = {};
    }

    if (err.type === "AUTHORIZATION_ERROR") {
      return {
        ok: false,
        message:
          `Squarespace rejected the API key (${res.status} AUTHORIZATION_ERROR${
            res.status === 401 ? "" : ", unexpected status for this body"
          }). Check it was copied whole from Settings → Developer Tools → API Keys and that it ` +
          "belongs to this website — a key is bound to the site it was generated on.",
      };
    }
    if (err.type === "WEBSITE_EXPIRED") {
      return {
        ok: false,
        message: `Squarespace reports the website is expired, so its API is unavailable${
          err.message ? `: ${err.message}` : ""
        }`,
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message:
          "Squarespace rate-limited this read (429). It allows 300 requests/minute; retry with " +
          "backoff.",
      };
    }
    if (err.type) {
      return {
        ok: false,
        message: `Squarespace returned ${res.status} ${err.type}${
          err.subtype ? `/${err.subtype}` : ""
        }${err.message ? `: ${err.message}` : ""}${
          err.contextId ? ` (contextId ${err.contextId})` : ""
        }`,
      };
    }
    return {
      ok: false,
      message: `Squarespace returned HTTP ${res.status} for ${PROBE_PATH} with no readable error ` +
        "body",
    };
  },

  /**
   * Publish the website's title so a list of connections does not read as
   * "Squarespace Commerce" repeated.
   *
   * It comes from the same read `test` already made, and only `title` and
   * `siteId` are kept — the profile also carries the website's URL, currency,
   * language and time zone, none of which belong in a connection label.
   *
   * A failure here is deliberately silent: `test` has established the key is
   * live, and a missing label must not fail a good connection.
   */
  async afterConnect({ credential }, ctx) {
    const key = String((credential as Partial<SquarespaceCredential>)?.apiKey ?? "").trim();
    if (!key) return {};
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, { headers: probeHeaders(key) });
      if (!res.ok) return {};
      const body = await res.json() as { title?: string; siteId?: string };
      const label: Record<string, unknown> = {};
      if (typeof body?.title === "string" && body.title.trim()) label.siteTitle = body.title;
      if (typeof body?.siteId === "string" && body.siteId.trim()) label.siteId = body.siteId;
      return label;
    } catch {
      return {};
    }
  },
};

export default apiKey;
