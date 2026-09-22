import type { AuthDefinition } from "@w6w/types";
import { applyStoreId, parseEcwidError, storeUrl } from "../lib/client.ts";

/**
 * Ecwid store credential — a **store id plus a secret access token**, presented
 * as `Authorization: Bearer <secret_token>`.
 *
 * Both halves were verified against Ecwid's own pages on 2026-09-22:
 * `get-started/make-your-first-api-request.md` ("Add **store ID** to the
 * *request path*, your **secret access token** as a *Bearer Token on the
 * Authorization tab*") and every endpoint page's Headers table
 * (`Authorization | Bearer secret_ab***cd`).
 *
 * ## Why there is no OAuth here
 *
 * Ecwid's REST API is nominally OAuth 2.0, and its docs are written for *public*
 * apps that get installed into many stores. This app is not one: it holds one
 * store's credential, and the vendor's own quickstart says so — "If you
 * customize your own store, however, you can skip OAuth and easily get an
 * access token for your store", from the Details page of a custom app in
 * `my.ecwid.com`. The **secret** token (as opposed to the public one, which
 * "allows only public data") is the credential, and it belongs in a
 * `type: "secret"` field so it is masked and encrypted at rest.
 *
 * ## The store id is a path segment, so `sign` is where it gets filled in
 *
 * Actions build `/api/v3/__storeId__<path>` through `lib/client.ts`; `sign`
 * substitutes the real id and stamps the bearer header. It is the only hook
 * that holds the credential, and therefore the only place either half can go on
 * the wire. Nothing about the credential ever reaches a URL (the token) or an
 * action (either half) — see the entry-module tests, which assert both.
 *
 * ## The probe: `GET /profile`, and the one documented exception
 *
 * `GET /profile` is the probe because it is the endpoint a *single-store*
 * credential is guaranteed to reach, and because its response is store
 * settings — it never echoes the token back. `GET /products` would work too,
 * but a token whose app lacks the `read_catalog` scope answers 403 against it
 * while being perfectly able to update the store profile, and reporting that
 * tenant as broken would be wrong.
 *
 * **Classifying the failure.** Ecwid documents
 * `{"errorCode": "SOME_CODE", "errorMessage": "…"}`, and live probing on
 * 2026-09-22 confirmed it: an out-of-range store id answered
 * `404 {"errorCode":"STORE_NOT_FOUND","errorMessage":"Store not found"}`. So
 * whenever a JSON body *is* present, the code — not the status — decides
 * (`STORE_NOT_FOUND` is reported as a bad store id no matter which status
 * carries it).
 *
 * But the pack's "never decide from the status code alone" rule has exactly one
 * documented exception in this app, and this is it: live probing against the
 * docs' own demo store (`1003`) returned a bare **403 with an empty body**
 * (`content-length: 0`) for *both* a missing `Authorization` header and a
 * fake token. There is no body to read, and the vendor documents both of its
 * token errors (`INVALID_API_TOKEN`, `INSUFFICIENT_APP_SCOPE`) as 403 — so for
 * this vendor a bodyless 401/403 *is* the credential being refused, and the
 * `test` hook below says so in as many words.
 */

export interface EcwidCredential {
  /** Numeric Ecwid store id. Used as a path segment on every request. */
  storeId: string;
  /** Custom app's secret access token. */
  token: string;
}

/**
 * The one place the wire format is built.
 *
 * Exported so `test` and `afterConnect` exercise the same string `sign` does —
 * a hand-rolled second copy is how a probe ends up sending a header the real
 * requests do not.
 */
export function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

/**
 * Ecwid store ids are numeric: every documented request example addresses the
 * store as `/api/v3/1003/…`. Rejecting anything else at connect time is worth
 * more than a `404 STORE_NOT_FOUND` later, because a non-numeric id usually
 * means the store *URL slug* was pasted instead of the id.
 */
export function normaliseStoreId(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  return /^[0-9]+$/.test(raw) ? raw : undefined;
}

/** The credential-liveness probe — see this file's header for why this one. */
export const PROBE_PATH = "/profile";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "Store ID and Secret Token",
  description:
    "An Ecwid store id plus a custom app's secret access token. The store id is part of every " +
    "request's path; the token is sent as a bearer token.",
  connectionLabel: "{{storeName}}",
  fields: [
    {
      key: "storeId",
      label: "Store ID",
      type: "string",
      required: true,
      placeholder: "1003",
      hint:
        "Numeric Ecwid store id, visible in any page of the store's admin URL or in the footer " +
        "of the Ecwid admin. Not the store's web address.",
    },
    {
      key: "token",
      label: "Secret Access Token",
      type: "secret",
      required: true,
      hint: "From my.ecwid.com → Develop Apps → your custom app → Details. Copy the **secret** " +
        "token, not the public one: the public token only reaches public data. Reinstall the " +
        "custom app from that page if the token is missing.",
    },
  ],

  /**
   * Network-less: stamps the bearer header and fills in the store id the client
   * left as `STORE_PLACEHOLDER`. The token never appears in a URL, because a
   * workflow host logs URLs and does not log headers.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<EcwidCredential>;
    for (const [name, value] of Object.entries(authHeaders(String(cred.token ?? "").trim()))) {
      request.headers[name] = value;
    }
    const storeId = normaliseStoreId(cred.storeId);
    if (storeId) request.url = applyStoreId(request.url, storeId);
    return request;
  },

  /** See this file's header for the probe choice and the status-classification exception. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<EcwidCredential>;
    const rawStoreId = String(cred?.storeId ?? "").trim();
    const token = String(cred?.token ?? "").trim();
    if (!rawStoreId) return { ok: false, message: "credential missing storeId" };
    const storeId = normaliseStoreId(rawStoreId);
    if (!storeId) {
      return {
        ok: false,
        message:
          `the store id "${rawStoreId}" is not numeric. Ecwid addresses a store as a number in ` +
          "the request path (`/api/v3/1003/…`) — copy it from the Ecwid admin URL rather than " +
          "using the store's web address.",
      };
    }
    if (!token) return { ok: false, message: "credential missing token" };

    const res = await ctx.fetch(storeUrl(storeId, PROBE_PATH), {
      headers: { accept: "application/json", ...authHeaders(token) },
    });
    const raw = await res.text().catch(() => "");
    const err = parseEcwidError(raw);

    if (res.ok) return { ok: true };

    // Body first, wherever there is one: the code names the problem precisely.
    if (err?.errorCode === "STORE_NOT_FOUND" || res.status === 404) {
      return {
        ok: false,
        message:
          `Ecwid has no store with id ${storeId} (404${
            err?.errorCode ? ` ${err.errorCode}` : ""
          }). Check the store id — it is the number in the Ecwid admin URL, and the token must ` +
          "belong to that same store.",
      };
    }
    if (
      err?.errorCode === "STORE_IS_SUSPENDED" || err?.errorCode === "NOT_AVAILABLE_ON_CURRENT_PLAN"
    ) {
      return {
        ok: false,
        message: `Ecwid refused the request for store ${storeId}: ${err.errorCode}${
          err.errorMessage ? ` — ${err.errorMessage}` : ""
        }`,
      };
    }

    // The documented exception: a bodyless 401/403 is the credential being
    // refused, because this vendor really does answer that way (see the header).
    if (res.status === 401 || res.status === 403) {
      const code = err?.errorCode;
      if (code === "INSUFFICIENT_APP_SCOPE") {
        return {
          ok: false,
          message: `the token is live but the custom app lacks the scope this probe needs ` +
            `(${code}). Add \`read_store_profile\` to the custom app's access scopes in ` +
            "my.ecwid.com → Develop Apps → your app → Details.",
        };
      }
      return {
        ok: false,
        message:
          `Ecwid rejected the token for store ${storeId} (${res.status}${
            code ? ` ${code}` : ", empty body"
          }). Check the token was copied exactly from the custom app's Details page (the ` +
          "*secret* token, not the public one) and that the app is still installed. Ecwid can " +
          "also answer 403 when the app lacks a required scope.",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message: `Ecwid rate-limited this token (429${
          res.headers.get("retry-after") ? `, retry after ${res.headers.get("retry-after")}s` : ""
        }). It allows 600 requests/minute per token; retry with backoff.`,
      };
    }
    return {
      ok: false,
      message: `Ecwid returned HTTP ${res.status} for ${PROBE_PATH}${
        err?.errorCode ? ` (${err.errorCode})` : ""
      }`,
    };
  },

  /**
   * Publish the store's own name, so a list of connections does not read as
   * "Ecwid" repeated. It comes from `settings.storeName` on the profile — the
   * same read `test` already made — and nothing else is kept: the profile also
   * carries the account's email and billing details, which have no business on
   * the health surface.
   *
   * A failure here is deliberately silent: `test` has already established the
   * credential is live, and a missing display label must not fail a good
   * connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<EcwidCredential>;
    const storeId = normaliseStoreId(cred?.storeId);
    const display: Record<string, unknown> = {};
    if (storeId) display.storeId = Number(storeId);
    const token = String(cred?.token ?? "").trim();
    if (!storeId || !token) return display;
    try {
      const res = await ctx.fetch(storeUrl(storeId, PROBE_PATH), {
        headers: { accept: "application/json", ...authHeaders(token) },
      });
      if (!res.ok) return display;
      const body = await res.json().catch(() => null) as {
        settings?: { storeName?: string };
      } | null;
      const storeName = body?.settings?.storeName?.trim();
      if (storeName) display.storeName = storeName;
      return display;
    } catch {
      return display;
    }
  },
};

export default apiKey;
