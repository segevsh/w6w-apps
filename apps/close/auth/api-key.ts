import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Close API key, carried as HTTP Basic with an EMPTY password.
 *
 * ## The unusual bit, stated precisely
 *
 * Close does not send the key in a bearer or custom header. It uses HTTP Basic,
 * and the API key goes in the **username** position with **nothing** in the
 * password position. Close's own authentication page says it in as many words:
 *
 *   > "send your HTTP requests with an Authorization header that contains the
 *   > word Basic followed by a space and a base64-encoded string composed of an
 *   > api key followed by a colon. The API key acts as the username and the
 *   > password is always empty."
 *
 * and demonstrates it with `curl https://api.close.com/api/v1/me/ -u yourapikey:`
 * — "Notice the ':' at the end of the api key." The page then prints the exact
 * wire result, which is the single best test vector for this hook:
 *
 *   > `Authorization: Basic eW91cmFwaWtleTo=`  ...  base64 of `yourapikey:`
 *
 * Close's machine-readable OpenAPI document agrees: its `ApiKeyAuth` security
 * scheme is `{ "type": "http", "scheme": "basic" }` described as "Use your API
 * key as the username and leave the password empty." (Both verified 2026-08-03.)
 *
 * So the encoded payload is `${apiKey}:` — the trailing colon is REQUIRED and is
 * the whole subtlety. `base64("key")` without it is a different string and Close
 * rejects it. `tests/auth/api-key.test.ts` pins this against Close's own
 * published vector.
 *
 * ## Why `type: "basic"` and not `type: "apiKey"`
 *
 * The credential is conceptually an API key, but `ApiKeyConfig` can only express
 * "put this value, with this prefix, in this header/query/body slot". It cannot
 * express "base64 the value with a colon appended", so declaring `type: "apiKey"`
 * with an `apiKey` config would describe a wire format this app does not use and
 * a host could not reproduce. `type: "basic"` plus an explicit `sign` hook is the
 * accurate description: Basic is genuinely what goes over the wire.
 *
 * There is deliberately ONE field rather than the usual username/password pair.
 * The password is not a secret the user has — it is fixed at empty by the
 * protocol — so prompting for it would invite people to type something wrong.
 *
 * ## OAuth 2.0 exists
 *
 * Close also supports an authorization-code OAuth 2.0 flow
 * (`https://app.close.com/oauth2/authorize/` / `https://api.close.com/oauth2/token/`,
 * scopes `all.full_access` and `offline_access`, per the same OpenAPI document).
 * We ship the API key because it needs no app registration, no redirect URI and
 * no client secret. OAuth is the right choice for a multi-org listed
 * integration; add it as a second `AuthDefinition` when that is needed.
 */

/**
 * Inlined base64 encoder — the app sandbox runs with `import: false`, so we
 * cannot pull `jsr:@std/encoding` at runtime. Same output as @std/encoding's
 * `encodeBase64`: standard base64 with `=` padding, no url-safe swaps.
 */
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * The one place the wire format is built. Exported so the `test` hook and the
 * unit tests exercise the same code path the `sign` hook uses — a second,
 * hand-rolled copy in `test` is exactly how a trailing colon goes missing.
 */
export function basicHeader(apiKey: string): string {
  return `Basic ${encodeBase64(`${apiKey}:`)}`;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Paste an API key from Close → Settings → Developer → API Keys. Sent as HTTP Basic with the " +
    "key as the username and an empty password.",
  connectionLabel: "{{user.email}} — {{organization.name}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      placeholder: "api_...",
      hint:
        "Close → Settings → Developer → API Keys. Scoped to one user/organization pair, so it " +
        "carries exactly that user's permissions. No password is needed — Close fixes it empty.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it stamps
   * the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["authorization"] = basicHeader(key);
    return request;
  },

  /**
   * `GET /me/` — Close's whoami, and the call its own documentation uses to
   * demonstrate a working key.
   *
   * It is the right liveness probe precisely because it requires no permission
   * beyond existing: an API key is scoped to a user/organization pair, and every
   * such key can read itself. Probing a resource endpoint instead (say `/lead/`)
   * would report a working credential as broken whenever the key belongs to a
   * user whose role lacks that particular grant.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}/me/`, {
      headers: { accept: "application/json", authorization: basicHeader(key) },
    });
    if (res.status === 401) return { ok: false, message: "Close rejected the API key (401)" };
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message: string | undefined;
      try {
        message = (JSON.parse(body) as { error?: string }).error;
      } catch {
        // Non-JSON body; the status alone is the more honest message.
      }
      return { ok: false, message: message ?? `Close returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Labels the Connection with who and where, from the same `/me/` payload.
   *
   * `memberships` is how Close reports the organizations a user belongs to; a
   * key is scoped to exactly one of them, so the first entry is the relevant
   * one. Nothing here can carry credential material — only the user's own name,
   * email and org name are copied out.
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/me/`, {
      headers: { accept: "application/json", authorization: basicHeader(key) },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      id?: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      organizations?: Array<{ id?: string; name?: string }>;
      memberships?: Array<{ organization_id?: string }>;
    } | null;
    if (!body) return {};

    const org = body.organizations?.[0];
    return {
      user: {
        id: body.id,
        email: body.email,
        name: [body.first_name, body.last_name].filter(Boolean).join(" ") || undefined,
      },
      organization: {
        id: org?.id ?? body.memberships?.[0]?.organization_id,
        name: org?.name,
      },
    };
  },
};

export default apiKey;
