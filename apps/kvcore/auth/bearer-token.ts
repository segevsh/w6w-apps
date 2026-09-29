import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, flattenKvCoreErrors } from "../lib/client.ts";

/**
 * kvCORE Public API V2 — `Authorization: Bearer <token>`, a self-issued JWT.
 *
 * Verified on 2026-09-29 against the vendor's "Request Access" and "Getting
 * Started" guides (`developer.insiderealestate.com/publicv2/docs/*`) plus a
 * live probe against `api.kvcore.com`.
 *
 * ## Why this app does not use OAuth
 *
 * `developer.insiderealestate.com` also documents a second, newer OAuth 2.1
 * API at `api.boldtrail.com`. This app deliberately does not target it: its
 * own "Request access" page states **"This API is not yet publicly
 * available... accessible to partners by invite only"** — there is no
 * self-serve way to register a client or obtain a credential for it. The V2
 * API's own "Request Access" guide is explicit that OAuth was available for
 * V2 "in some specific requests, but at this time is paused" — so this app
 * targets V2's only live path: a user-issued bearer token.
 *
 * ## Getting a token — self-serve, no partner approval
 *
 * Any kvCORE user generates their own token from **Lead Engine > Lead
 * Dropbox > My API Tokens**, in one of three scopes: `All` (every public
 * endpoint), `Contacts` (read/create/update contacts), or `Users` (read the
 * token owner's own user profile). The token is a JWT; its claims (`sub`,
 * `aud`, …) are only ever read by the vendor, never by this app.
 *
 * ## `sign` is the only hook holding the raw credential
 *
 * It runs network-less and simply stamps the header — this app never sees
 * the token outside `sign` and `test`.
 */

export interface KvCoreCredential {
  apiToken: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<KvCoreCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v2/public/contacts?limit=1`.
 *
 * Chosen over the alternatives for a documented reason each:
 *
 * - It needs a credential — the vendor's own Response Codes guide (and a live
 *   probe on 2026-09-29) confirm a missing or invalid token answers `401`
 *   with `{"errors":["Authentication Failed"]}`.
 * - It returns no credential material — a contact record carries no secret.
 * - `limit=1` keeps the read cheap and honest: this is exactly the read a
 *   Contacts-scoped (or All-scoped) integration will exercise on every real
 *   call.
 *
 * **Known gap, disclosed rather than guessed around:** kvCORE's tokens are
 * independently scoped to `All`, `Contacts`, or `Users`. There is no
 * documented unscoped "whoami" endpoint every scope can reach, so a
 * `Users`-only token — which the vendor's own docs say can pull only "your
 * user profile" — will fail this probe with `403` even though it is a live,
 * correctly-scoped credential. This app's own action surface is built around
 * Contact and account management, so `Contacts`/`All` is the expected scope
 * for a connection here; a `Users`-only token is the one legitimate case
 * this check cannot certify, and `test`'s 403 branch below says so rather
 * than reporting a flat "invalid credential".
 */
export const PROBE_PATH = "/contacts";

const kvcoreBearer: AuthDefinition = {
  key: "bearer-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste a bearer token generated from your kvCORE account's Lead Engine > Lead Dropbox > My " +
    'API Tokens. Grant it the "All" or "Contacts" scope for this app\'s contact actions, and ' +
    '"All" for the user/office/team actions.',
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint:
        "kvCORE > Lead Engine > Lead Dropbox > My API Tokens. Use a token scoped no wider than " +
        "this connection needs.",
    },
  ],

  /** The only hook handed the raw token. Network-less: it stamps and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<KvCoreCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint, and its one known gap. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<KvCoreCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`, {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...authHeaders({ apiToken: token }),
      },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { errors?: string[] | Record<string, string[]> }
      | null;
    const messages = flattenKvCoreErrors(body?.errors);

    if (res.status === 401) {
      return {
        ok: false,
        message: `kvCORE rejected the token (401${
          messages.length ? `: ${messages.join("; ")}` : ""
        }). Generate a fresh token from Lead Dropbox > My API Tokens.`,
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message:
          `kvCORE refused this read (403${
            messages.length ? `: ${messages.join("; ")}` : ""
          }). If this token was scoped to "Users" only, that is expected — this check needs ` +
          '"Contacts" or "All" scope; the token may still be live for its own scope.',
      };
    }
    return {
      ok: false,
      message: `kvCORE returned HTTP ${res.status} for ${PROBE_PATH}${
        messages.length ? `: ${messages.join("; ")}` : ""
      }`,
    };
  },
};

export default kvcoreBearer;
