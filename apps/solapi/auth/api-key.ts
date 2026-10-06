import type { AuthDefinition } from "@w6w/types";
import { API_BASE, baseHeaders, errorText, obj } from "../lib/client.ts";

/**
 * SOLAPI API key pair — `Authorization: HMAC-SHA256 apiKey=…, date=…, salt=…, signature=…`.
 *
 * ## The signature
 *
 * SOLAPI does not take the secret on the wire. Each request carries an ISO 8601 `date`, a random
 * `salt`, and `signature` = hex(HMAC-SHA256(key = apiSecret, message = date + salt)). The
 * official Node SDK (`solapi-nodejs/src/lib/authenticator.ts`) builds it exactly so, with a
 * 32-character alphanumeric salt. The signature covers neither the URL nor the body, so one
 * header is valid for any request inside the server's clock window.
 *
 * ## Where it runs
 *
 * {@link buildAuthorization} is the only code that touches `apiSecret`. It runs in `sign`
 * (network-less) and in `test`, which has to build the same header by hand because `sign` is
 * applied to action traffic only. It uses Web Crypto, which the sandbox provides.
 *
 * ## The probe is `GET /cash/v1/balance`
 *
 * It needs no scope beyond the key itself and returns the account's own balance, never a
 * credential. Classification is from the BODY (`errorCode` / `errorMessage`), not the status:
 * measured 2026-10-06, no header answers `401 {"errorCode":"Unauthorized"}`, a malformed key
 * answers **400** `{"errorCode":"ValidationError"}` ("apiKey length must be 16 characters long"),
 * and a Bearer token answers **400** `{"errorCode":"InvalidToken"}` — so both 400 and 401 can
 * mean "rejected credential". A pass is a 2xx carrying a numeric `balance`.
 */

export interface SolapiCredential {
  apiKey: string;
  apiSecret: string;
}

export const PROBE_PATH = "/cash/v1/balance";

const SALT_ALPHABET = "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 32 random alphanumerics. The modulo bias over 62 symbols is irrelevant for a one-time salt. */
export function makeSalt(size = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let out = "";
  for (let i = 0; i < size; i++) out += SALT_ALPHABET[bytes[i] % SALT_ALPHABET.length];
  return out;
}

/** ISO 8601 UTC with whole seconds, e.g. `2026-10-06T09:30:00Z`. */
export function isoDate(now: Date = new Date()): string {
  return now.toISOString().replace(/\.\d+Z$/, "Z");
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The signature: hex HMAC-SHA256 of `date + salt`, keyed by the API secret. */
export async function signature(apiSecret: string, date: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(date + salt)));
}

/** The whole `Authorization` value. `date` and `salt` are injectable so tests are exact. */
export async function buildAuthorization(
  credential: Partial<SolapiCredential>,
  date: string = isoDate(),
  salt: string = makeSalt(),
): Promise<string> {
  const apiKey = (credential.apiKey ?? "").trim();
  const apiSecret = (credential.apiSecret ?? "").trim();
  const sig = await signature(apiSecret, date, salt);
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${sig}`;
}

const apiKeyAuth: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key and Secret",
  description: "Paste a SOLAPI API key and API secret (console.solapi.com > API Key). Each " +
    "request is signed with HMAC-SHA256; the secret is never sent.",
  connectionLabel: "SOLAPI",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "SOLAPI console > Developers > API Key. A 16-character string such as " +
        "NCSAYU7II8WUDJOI.",
    },
    {
      key: "apiSecret",
      label: "API Secret",
      type: "secret",
      required: true,
      hint: "The 32-character secret shown next to the key. It signs requests and is not " +
        "sent over the wire.",
    },
  ],

  /** The only hook handed the raw secret; network-less, it stamps the signed header. */
  async sign({ request, credential }) {
    request.headers["authorization"] = await buildAuthorization(
      credential as Partial<SolapiCredential>,
    );
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<SolapiCredential> | undefined;
    const key = (cred?.apiKey ?? "").trim();
    const secret = (cred?.apiSecret ?? "").trim();
    if (!key || !secret) {
      return { ok: false, message: "credential needs both apiKey and apiSecret" };
    }

    // `sign` only auto-applies to action traffic, so the header is built by hand here.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { ...baseHeaders(), authorization: await buildAuthorization(cred!) },
    });
    const body = await res.json().catch(() => null);

    if (res.ok) {
      if (typeof obj(body).balance === "number") return { ok: true };
      return {
        ok: false,
        message: `SOLAPI answered ${res.status} but not with the documented balance ` +
          "response — not judged a valid key.",
      };
    }
    const msg = errorText(body);
    if (res.status === 401 || res.status === 403 || res.status === 400) {
      return {
        ok: false,
        message: `SOLAPI refused the credential (${res.status}${msg ? ` ${msg}` : ""}). Check ` +
          "the API key and secret were copied together from the console and the key is active.",
      };
    }
    return {
      ok: false,
      message: `SOLAPI returned HTTP ${res.status}${msg ? ` (${msg})` : ""} for the balance ` +
        "probe; the credential was not judged.",
    };
  },
};

export default apiKeyAuth;
