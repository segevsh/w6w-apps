import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * SendFox personal access token — `Authorization: Bearer <token>`.
 *
 * ## Personal Access Token, not the OAuth dance
 *
 * SendFox's OpenAPI document declares a single `securityScheme`, `oauth2`
 * (authorizationCode flow, authorize/token URLs under `sendfox.com/oauth/*`),
 * and its `info.description` goes on to explain the mechanism API clients
 * actually use:
 *
 *     Create a personal access token at https://sendfox.com/account/oauth. Once
 *     created, use it in the Authorization header:
 *         Authorization: Bearer {TOKEN}
 *
 * This app is built against that model — a static bearer token the user pastes
 * in — because the authorization-code flow needs a redirect/browser dance a
 * workflow host does not model, and because the vendor's own guidance names the
 * PAT as the supported path for API integrations. The manifest therefore
 * declares one method, `type: "bearer"`, and never touches the OAuth endpoints.
 *
 * ## Header only
 *
 * SendFox documents no `?token=` alternative and this app builds none: a
 * workflow host logs request URLs, and does not log request headers.
 */

export interface SendfoxCredential {
  token: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<SendfoxCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.token ?? ""}` };
}

/**
 * The credential-liveness probe.
 *
 * `GET /me` was chosen by reading its **response schema**, not its name.
 * SendFox's `User` schema is `{id, name, email, contacts_count, contact_limit,
 * created_at, updated_at}` — seven fields and no credential among them. That
 * check is the whole point: Follow Up Boss's `/me` and Mailjet's `/apikey`
 * return the caller's own key and are banned pack-wide for it. SendFox's `/me`
 * does not, so the cheap whoami is safe here, and it is also the endpoint
 * `health/quota.ts` reads its rate-limit headers from.
 *
 * It is the only endpoint in the surface that needs no id, and the only
 * alternative — any collection — would put third parties' names, emails and IP
 * addresses on the wire for a probe that only has to answer "is this token
 * live".
 */
export const PROBE_PATH = "/me";

/**
 * SendFox returns the **same** body for "no token" and "bad token".
 *
 * Measured live 2026-09-22: a request with no `Authorization` header and one
 * with a syntactically plausible fake bearer both answer byte-identically —
 * `HTTP/2 401` + `{"message":"Unauthenticated."}` (25 bytes). So there is no
 * field-level way to tell "the credential never reached the request" from "the
 * credential is wrong", and `test` must not pretend otherwise: it reports one
 * message naming both possibilities.
 */
export const UNAUTHENTICATED_BODY = "Unauthenticated.";

/** What a liveness `200` has to look like to count as a `User`. */
export function looksLikeUser(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { email?: unknown }).email === "string" &&
    (body as { email: string }).email.length > 0
  );
}

const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "Paste a personal access token from SendFox → Account → OAuth. API access requires a " +
    "Lifetime or Empire plan; a Free account cannot use the API.",
  connectionLabel: "SendFox ({{email}})",
  fields: [
    {
      key: "token",
      label: "Personal access token",
      type: "secret",
      required: true,
      hint: "Created at https://sendfox.com/account/oauth. Use a token dedicated to this " +
        "connection rather than one shared with other services.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The token never appears in a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<SendfoxCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * See {@link PROBE_PATH} for why `/me`. Success is decided from the **body**,
   * not the status code: a `200` that does not carry a `User` is reported as such
   * rather than waved through.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<SendfoxCredential>;
    const token = (cred?.token ?? "").trim();
    if (!token) return { ok: false, message: "credential missing token" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ token }) },
    });

    const raw = await res.text().catch(() => "");

    if (res.ok) {
      let body: unknown = null;
      try {
        body = JSON.parse(raw);
      } catch { /* handled below as a non-User body */ }
      if (looksLikeUser(body)) return { ok: true };
      return {
        ok: false,
        message:
          `SendFox answered 200 for ${PROBE_PATH} but the body is not a User object, so this ` +
          "does not look like a SendFox API response.",
      };
    }

    if (res.status === 403) {
      let body: Record<string, unknown> | null = null;
      try {
        body = JSON.parse(raw);
      } catch { /* fall through to the generic refusal below */ }
      if (body?.code === "account_restricted") {
        const url = typeof body.account_status_url === "string" ? body.account_status_url : "";
        return {
          ok: false,
          message:
            "SendFox has restricted this account (403 account_restricted), so authenticated API " +
            `endpoints are unavailable.${url ? ` Account status: ${url}` : ""}`,
        };
      }
      return {
        ok: false,
        message:
          "SendFox refused the account read (403). API access requires a Lifetime or Empire " +
          "plan, and a restricted or unsubscribed account is refused the same way.",
      };
    }

    if (res.status === 401) {
      return {
        ok: false,
        message:
          `SendFox rejected the request (401 ${UNAUTHENTICATED_BODY}). It returns the same body ` +
          "for a missing and an invalid token, so check the token was copied exactly and has not " +
          "been revoked on the account OAuth page (sendfox.com/account/oauth), and note that API " +
          "access requires a Lifetime or Empire plan.",
      };
    }

    return { ok: false, message: `SendFox returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish the account's name and email — the two fields that make a list of
   * Connections readable — and drop everything else.
   *
   * `contacts_count`, `contact_limit` and the timestamps are deliberately not
   * kept: a Connection label does not need them, and narrowing what is *kept*
   * is cheaper to keep correct than auditing what a whole-object copy might one
   * day contain.
   *
   * A failure here is deliberately silent: `test` has already established the
   * token is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<SendfoxCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      // `GET /me` answers the bare `User` entity, not `{"data": …}` — see the
      // envelope note in `lib/client.ts`.
      const body = await res.json() as { name?: string; email?: string };
      const out: Record<string, string> = {};
      if (body?.name) out.name = body.name;
      if (body?.email) out.email = body.email;
      return out;
    } catch {
      return {};
    }
  },
};

export default personalAccessToken;
