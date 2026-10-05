/**
 * Token-Based Authentication (OAuth 1.0a, HMAC-SHA256) for NetSuite REST web services.
 *
 * Verified 2026-10-05 against Oracle's "The Signature for Web Services and RESTlets" and
 * "The Authorization Headers" pages, including the published known-answer vector
 * (`GET https://123456.suitetalk.api.netsuite.com/services/rest/record/v1/employee/40` signs to
 * `B5OIWznZ2YP0OB7VrJrGkYsTh+8H+5T9Hag+o92q0zY=`), which `tests/lib/tba.test.ts` pins.
 *
 * - Signature method is `HMAC-SHA256`; HMAC-SHA1 support ended in NetSuite 2023.1.
 * - Base string: `METHOD & enc(url without query) & enc(sorted, encoded params)` where the params
 *   are the six `oauth_*` values (without `realm`) plus every query-string pair. A JSON body is
 *   never part of it.
 * - Key: `enc(consumerSecret) & enc(tokenSecret)`.
 * - Header: `Authorization: OAuth realm="…", oauth_token="…", …, oauth_signature="…"` with every
 *   value percent-encoded. The realm is the account id in NetSuite's own form (`1234567_SB1`),
 *   not the lowercase-hyphen hostname form.
 *
 * Pure functions only (Web Crypto, no ambient state), so `sign` stays network-less.
 */

export interface TbaCredential {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}

/** RFC 3986 percent-encoding (what PHP `rawurlencode` does and what OAuth 1.0 requires). */
export function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/** The realm NetSuite expects: account id upper-cased with `_` (`1234567-sb1` -> `1234567_SB1`). */
export function realmOf(accountId: string): string {
  return accountId.trim().toUpperCase().replace(/-/g, "_");
}

export function nonce(length = 20): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function baseString(
  method: string,
  url: string,
  oauth: Record<string, string>,
): string {
  const u = new URL(url);
  const pairs: Array<[string, string]> = [];
  for (const [k, v] of u.searchParams) pairs.push([rfc3986(k), rfc3986(v)]);
  for (const [k, v] of Object.entries(oauth)) pairs.push([rfc3986(k), rfc3986(v)]);
  pairs.sort((
    a,
    b,
  ) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  const normalised = pairs.map(([k, v]) => `${k}=${v}`).join("&");
  const origin = `${u.protocol}//${u.host}${u.pathname}`;
  return `${method.toUpperCase()}&${rfc3986(origin)}&${rfc3986(normalised)}`;
}

async function hmacSha256Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(message)));
  let bin = "";
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Build the `Authorization` header value. `nonceValue`/`timestamp` are injectable for tests. */
export async function tbaAuthorization(
  method: string,
  url: string,
  cred: TbaCredential,
  nonceValue: string = nonce(),
  timestamp: string = String(Math.floor(Date.now() / 1000)),
): Promise<string> {
  const oauth = {
    oauth_consumer_key: cred.consumerKey,
    oauth_nonce: nonceValue,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: timestamp,
    oauth_token: cred.tokenId,
    oauth_version: "1.0",
  };
  const key = `${rfc3986(cred.consumerSecret)}&${rfc3986(cred.tokenSecret)}`;
  const signature = await hmacSha256Base64(key, baseString(method, url, oauth));
  const parts: Array<[string, string]> = [
    ["realm", realmOf(cred.accountId)],
    ["oauth_token", oauth.oauth_token],
    ["oauth_consumer_key", oauth.oauth_consumer_key],
    ["oauth_nonce", oauth.oauth_nonce],
    ["oauth_timestamp", oauth.oauth_timestamp],
    ["oauth_signature_method", oauth.oauth_signature_method],
    ["oauth_version", oauth.oauth_version],
    ["oauth_signature", signature],
  ];
  return "OAuth " + parts.map(([k, v]) => `${k}="${rfc3986(v)}"`).join(", ");
}
