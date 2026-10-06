import type { AuthDefinition } from "@w6w/types";
import { API_ROOT, errorCode, errorText } from "../lib/client.ts";

/**
 * FareHarbor API keys — two headers, both required.
 *
 * Spec: "Authentication" section. `X-FareHarbor-API-App` identifies the integration partner's
 * app; `X-FareHarbor-API-User` identifies the user key, which is **issued per currency**
 * (a partner serving suppliers in two currencies holds two Connections). Both are UUIDs and
 * the spec says to keep them private. The spec also allows `api-app` / `api-user` query
 * parameters; this app never uses them, because a URL ends up in logs and a header does not.
 * Keys are issued by FareHarbor after a partnership request and API certification
 * (strategicpartnerships@fareharbor.com) — there is no self-serve signup.
 *
 * ## The probe is `GET /companies/`
 *
 * Chosen by the response body, not the name. It lists the suppliers the keys may book —
 * company names, shortnames, currencies — and never echoes a key. (`GET /ping/` answers 200
 * with an EMPTY body and no keys at all, so it only proves reachability.)
 *
 * Verdicts come from the body's `code`, with the status as a hint (measured 2026-10-06):
 *
 *   - no headers   -> 400 `key-missing`: the credential never reached the request;
 *   - bad app key  -> 403 `app-key-invalid`;
 *   - bad user key -> 403 `user-key-invalid` (documented in the spec's error table).
 *
 * A 403 can ALSO be rate limiting (spec: over the limit answers 429 or 403), so only the
 * three documented key codes are called a bad credential.
 */

export interface FareHarborCredential {
  appKey: string;
  userKey: string;
}

export const PROBE_PATH = "/companies/";

const apiKeys: AuthDefinition = {
  key: "api-keys",
  type: "custom",
  displayName: "App Key & User Key",
  description:
    "The two keys FareHarbor issues to an API partner: the App key and the User key. The User " +
    "key is tied to one currency, so create one connection per currency you serve.",
  connectionLabel: "FareHarbor",
  fields: [
    {
      key: "appKey",
      label: "App Key",
      type: "secret",
      required: true,
      hint: "Sent as X-FareHarbor-API-App. Issued by FareHarbor to your integration.",
    },
    {
      key: "userKey",
      label: "User Key",
      type: "secret",
      required: true,
      hint: "Sent as X-FareHarbor-API-User. One per currency; it decides which suppliers " +
        "/companies/ lists.",
    },
  ],

  /** The only hook handed the raw credential; network-less — stamps both headers and returns. */
  sign({ request, credential }) {
    const { appKey, userKey } = credential as Partial<FareHarborCredential>;
    request.headers["X-FareHarbor-API-App"] = appKey ?? "";
    request.headers["X-FareHarbor-API-User"] = userKey ?? "";
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<FareHarborCredential>;
    const appKey = (cred?.appKey ?? "").trim();
    const userKey = (cred?.userKey ?? "").trim();
    if (!appKey || !userKey) return { ok: false, message: "credential missing appKey or userKey" };

    const res = await ctx.fetch(`${API_ROOT}${PROBE_PATH}`, {
      headers: {
        accept: "application/json",
        "X-FareHarbor-API-App": appKey,
        "X-FareHarbor-API-User": userKey,
      },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null);
    const code = errorCode(body);
    const text = errorText(body);
    if (code === "key-missing") {
      return {
        ok: false,
        message: "FareHarbor received no keys. They did not reach the request — reconnect.",
      };
    }
    if (code === "app-key-invalid" || code === "app-invalid") {
      return {
        ok: false,
        message: `FareHarbor rejected the App key (${res.status} ${code}). Check it was copied ` +
          "exactly and is a production key, not a demo-environment one.",
      };
    }
    if (code === "user-key-invalid") {
      return {
        ok: false,
        message: `FareHarbor rejected the User key (${res.status} ${code}). Check it was copied ` +
          "exactly and has not been rotated.",
      };
    }
    if (res.status === 429 || res.status === 403) {
      return {
        ok: false,
        message:
          `FareHarbor answered ${res.status}${code ? ` ${code}` : ""}${
            text ? `: ${text}` : ""
          } — this can be rate limiting (30 requests/second and 3,000 per 5 minutes per IP), ` +
          "not necessarily a bad key. Try again shortly.",
      };
    }
    return { ok: false, message: `FareHarbor returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default apiKeys;
