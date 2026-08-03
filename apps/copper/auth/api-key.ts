import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Copper API key — a THREE-header credential, not a bearer token.
 *
 * ## The unusual bit, stated precisely
 *
 * Copper does not use `Authorization` at all. Its Requests page ("All Copper API
 * calls must include the following headers to authenticate the request")
 * publishes a four-row table, and every single endpoint example in the docs
 * repeats it verbatim (verified 2026-08-03 against
 * <https://developer.copper.com/introduction/requests.html> and 148 occurrences
 * of each header across the endpoint pages):
 *
 *   | Key                | Value                          |
 *   |--------------------|--------------------------------|
 *   | `X-PW-AccessToken` | API Key                        |
 *   | `X-PW-Application` | `developer_api`                |
 *   | `X-PW-UserEmail`   | Email address of token owner   |
 *   | `Content-Type`     | `application/json`             |
 *
 * Three of those four are authentication and are stamped here.
 * `Content-Type` is a property of the request body, not of the credential, so
 * the client sets it on the calls that carry one.
 *
 * ### `X-PW-Application` really is the literal string `developer_api`
 *
 * It is not an app name, not a client id, and not a value the user supplies. The
 * docs table gives it as a fixed value, and every `curl` example in the docs
 * sends `--header "X-PW-Application: developer_api"` unchanged — including the
 * OAuth examples. It is therefore a constant in this file rather than a
 * connection field: prompting for it could only produce a wrong answer. The
 * string is the same one that appears as the `developer_api` path segment in the
 * base URL, which is a useful mnemonic and a coincidence worth not relying on.
 *
 * ### The user email is part of the CREDENTIAL, not of a request
 *
 * `X-PW-UserEmail` must carry "the email address of the user who generated the
 * token". A Copper key is minted by a specific user, inherits that user's Team
 * Permissions, and is meaningless paired with anyone else's address — so the
 * address is a second half of the credential, exactly like a username in Basic
 * auth. It therefore lives on the Connection and is stamped in `sign`.
 *
 * It is deliberately NOT an action parameter. Making it one would put a piece of
 * the credential in the network-capable action worker, let two actions on one
 * Connection disagree about who they are, and hand a workflow author a knob
 * whose only correct setting is a fixed value they cannot see. `tests/` asserts
 * no action declares such a param.
 *
 * `type: "secret"` is not used for it: an email address is not a secret, it is
 * an identifier, and masking it would make a mistyped address impossible to
 * spot. The token beside it is the secret.
 *
 * ## Why `type: "apiKey"` with only one slot declared
 *
 * `ApiKeyConfig` describes ONE placement — "put this value, with this prefix, in
 * this header". It is declared for `X-PW-AccessToken` because that is genuinely
 * where the key goes and a host reading the manifest should see it. The other
 * two headers cannot be expressed in that config at all, which is precisely why
 * an explicit `sign` hook exists. `prefix: ""` is set explicitly rather than
 * omitted, to say out loud that Copper takes the raw key with no scheme word.
 *
 * ## OAuth 2.0 exists
 *
 * Copper also documents an OAuth 2.0 flow, which it calls "the preferred
 * approach for partner integrations", while "API Keys are suitable for
 * individual users". We ship the API key because it needs no app registration,
 * no redirect URI and no client secret, and works in unattended background runs.
 * Add a second `AuthDefinition` of `type: "oauth2"` when this app is ever listed
 * as a Copper partner integration.
 */

/**
 * The literal Copper requires. A constant, not a field: the docs give exactly
 * one legal value and every published example sends it unchanged.
 */
export const APPLICATION_HEADER_VALUE = "developer_api";

export interface CopperCredential {
  apiKey: string;
  userEmail: string;
}

/**
 * The one place the wire format is built. Exported so the `test` and
 * `afterConnect` hooks and the unit tests exercise the same code path `sign`
 * uses — a second, hand-rolled copy is exactly how one of the three headers goes
 * missing on a probe.
 */
export function authHeaders(credential: Partial<CopperCredential>): Record<string, string> {
  return {
    "X-PW-AccessToken": credential.apiKey ?? "",
    "X-PW-Application": APPLICATION_HEADER_VALUE,
    "X-PW-UserEmail": credential.userEmail ?? "",
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Copper → System settings → API Keys, together with the email address " +
    "of the user who generated it. Copper authenticates on three headers at once: " +
    "`X-PW-AccessToken`, `X-PW-Application: developer_api` and `X-PW-UserEmail`.",
  connectionLabel: "{{user.email}} — {{account.name}}",
  apiKey: {
    in: "header",
    name: "X-PW-AccessToken",
    prefix: "",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Copper → System settings → API Keys → GENERATE API KEY. A key inherits its creator's " +
        "Team Permissions, so Copper recommends using an admin (ideally a dedicated integration " +
        "user) for API work.",
    },
    {
      key: "userEmail",
      label: "Token owner's email",
      type: "string",
      required: true,
      placeholder: "integrations@example.com",
      hint:
        "The Copper login of the user who generated the key. Sent as `X-PW-UserEmail` on every " +
        "request — Copper rejects the key without it. Not a secret, so it is shown rather than " +
        "masked; a typo here is otherwise invisible.",
      validation: { pattern: "^[^@\\s]+@[^@\\s]+$" },
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it stamps
   * all three headers onto the outbound request and returns it.
   *
   * All three go on together, always. There is no endpoint that wants a subset:
   * Copper's own wording is "All Copper API calls must include the following
   * headers", and omitting any one of them earns a 401.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<CopperCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /users/me` — Copper's whoami, and the narrowest probe available.
   *
   * It is the right liveness check precisely because it needs no permission
   * beyond existing: Copper documents it as returning "details about the current
   * API user... who owns the API key (or the OAuth access token) which was used
   * to make the API call". Probing a resource collection instead (say
   * `POST /people/search`) would report a working credential as broken whenever
   * Team Permissions restrict that user's record access — and Copper explicitly
   * warns that "The Dev API respects team permissions".
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<CopperCredential>;
    if (!cred?.apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!cred?.userEmail) {
      return {
        ok: false,
        message: "credential missing userEmail — Copper requires X-PW-UserEmail alongside the key",
      };
    }

    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message:
          `Copper rejected the credential (${res.status}). Check the key and that the email is ` +
          "the one that generated it.",
      };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message: string | undefined;
      try {
        const parsed = JSON.parse(body) as { message?: string; error?: string };
        message = parsed.message ?? parsed.error;
      } catch {
        // Non-JSON body; the status alone is the more honest message.
      }
      return { ok: false, message: message ?? `Copper returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Labels the Connection with who and where.
   *
   * Two cheap reads: `GET /users/me` for the operator (documented fields are
   * `id`, `name`, `email`, `groups`) and `GET /account` for the Copper account
   * they belong to (`id`, `name`, `primary_timezone`, `settings`). Nothing here
   * can carry credential material — only the user's own name and email and the
   * account's name are copied out.
   *
   * A failed account read is swallowed rather than failing the connect: the
   * label is cosmetic and the credential has already proved itself in `test`.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as CopperCredential;
    const headers = { accept: "application/json", ...authHeaders(cred) };

    const meRes = await ctx.fetch(`${API_URL}/users/me`, { headers });
    if (!meRes.ok) return {};
    const me = await meRes.json().catch(() => null) as {
      id?: number;
      name?: string;
      email?: string;
    } | null;
    if (!me) return {};

    let account: { id?: number; name?: string } | null = null;
    const accountRes = await ctx.fetch(`${API_URL}/account`, { headers });
    if (accountRes.ok) {
      account = await accountRes.json().catch(() => null) as { id?: number; name?: string } | null;
    }

    return {
      user: { id: me.id, name: me.name, email: me.email },
      account: { id: account?.id, name: account?.name },
    };
  },
};

export default apiKey;
