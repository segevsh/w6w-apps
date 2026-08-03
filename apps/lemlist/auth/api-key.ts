import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * lemlist API key, carried as HTTP Basic with an EMPTY **username**.
 *
 * ## The unusual bit, stated precisely
 *
 * lemlist uses HTTP Basic, and the API key goes in the **password** position
 * with **nothing** in the username position. lemlist's own authentication page
 * says it in as many words:
 *
 *   > "We use BASIC authentication NOT bearer."
 *   > Username: Empty · Password: Your API key
 *   > "Create string with format `:YourApiKey`" (the colon is required at the
 *   > start) → base64-encode it → `Authorization: Basic {encoded_result}`
 *
 * and the OpenAPI `info.description` shipped with every endpoint page repeats
 * it independently:
 *
 *   > "You need to add the `Authorization` header using the `Basic`
 *   > authentication type. `login:password` **where the login is always empty
 *   > and the password is the API key**."
 *
 * Every endpoint's `components.securitySchemes` is correspondingly
 * `{ type: http, scheme: basic }`. (All verified 2026-08-03.)
 *
 * So the encoded payload is `:${apiKey}` — the LEADING colon is REQUIRED and is
 * the whole subtlety.
 *
 * ## This is the mirror image of Close, and getting it backwards fails silently
 *
 * Close (`apps/close`) is Basic with the key as the **username** and an empty
 * password — `base64("key:")`. lemlist is the reverse — `base64(":key")`. Both
 * are syntactically valid Basic headers, so a swap does not throw anywhere in
 * this codebase; it just makes lemlist answer 401 forever. `basicHeader` is the
 * single place the colon's position is decided, and
 * `tests/auth/api-key.test.ts` pins it from both directions: it asserts the
 * decoded payload starts with `:`, and asserts the Close-shaped `base64("key:")`
 * is a DIFFERENT string.
 *
 * ## Why `type: "basic"` and not `type: "apiKey"`
 *
 * The credential is conceptually an API key, but `ApiKeyConfig` can only express
 * "put this value, with this prefix, in this header/query/body slot". It cannot
 * express "base64 the value with a colon prepended", so declaring
 * `type: "apiKey"` would describe a wire format this app does not use and a host
 * could not reproduce. `type: "basic"` plus an explicit `sign` hook is the
 * accurate description: Basic is genuinely what goes over the wire.
 *
 * There is deliberately ONE field rather than the usual username/password pair.
 * The username is not a secret the user has — it is fixed at empty by lemlist —
 * so prompting for it would invite people to type something wrong.
 *
 * ## `?access_token=` is NOT implemented, on purpose
 *
 * Older third-party write-ups and some community integrations pass the key as an
 * `access_token` query parameter. lemlist's current authentication page
 * documents **only** the Basic header and mentions no query-parameter form at
 * all (checked 2026-08-03), and a query-string secret leaks into logs, proxies
 * and referrer headers. The header is both the documented form and the safe one,
 * so it is the only one this app sends.
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
 * The one place the wire format is built. Exported so the `test` hook, the
 * `afterConnect` hook and the unit tests all exercise the same code path the
 * `sign` hook uses — a second, hand-rolled copy is exactly how a colon ends up
 * on the wrong side.
 */
export function basicHeader(apiKey: string): string {
  return `Basic ${encodeBase64(`:${apiKey}`)}`;
}

/**
 * lemlist answers auth failures with **`text/plain`**, not JSON — its OpenAPI
 * lists the bodies verbatim as "No API key provided" (400), "The authentication
 * you supplied is incorrect" (401), "User linked to this API key is blocked"
 * (403) and "No user found for this API key" (404). So the failure path reads
 * text and passes it through rather than attempting a JSON parse that would
 * always fail and discard the one useful sentence.
 */
async function failureMessage(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  const trimmed = body.trim();
  if (!trimmed || trimmed.startsWith("<")) return `lemlist returned HTTP ${res.status}`;
  return trimmed.length > 200 ? `lemlist returned HTTP ${res.status}` : trimmed;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Paste an API key from lemlist → Settings → Integrations. Sent as HTTP Basic with an EMPTY " +
    "username and the key as the password.",
  connectionLabel: "{{team.name}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "lemlist → Settings → Integrations → Generate a new API key " +
        "(https://app.lemlist.com/settings/integrations). No username is needed — lemlist fixes " +
        "it empty.",
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
   * `GET /team` — lemlist's whoami.
   *
   * It is the right liveness probe precisely because it requires no permission
   * beyond existing: an API key belongs to a user, a user belongs to exactly one
   * team, and every key can read its own team. Probing a resource endpoint
   * instead (say `/campaigns`) would still work today, but it is a listing whose
   * cost grows with the account and whose emptiness is indistinguishable from a
   * scoping problem. `/team` is a single constant-size row.
   *
   * `version=v2` is sent so the same shape comes back here as in `afterConnect`
   * and the `get-team` action.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}/team?version=v2`, {
      headers: { accept: "application/json", authorization: basicHeader(key) },
    });
    if (res.status === 401) return { ok: false, message: await failureMessage(res) };
    if (!res.ok) return { ok: false, message: await failureMessage(res) };
    return { ok: true };
  },

  /**
   * Labels the Connection with the team, from the same `/team` payload.
   *
   * `version=v2` is what adds the `users` array — lemlist's own words: "Set to
   * `v2` to include the `users` array, listing each team member's `userId`,
   * `name`, `email`, and `role`." We copy out only the team's id and name and
   * the member count; nothing here can carry credential material, and the
   * members' names and emails are deliberately NOT stored on the Connection.
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/team?version=v2`, {
      headers: { accept: "application/json", authorization: basicHeader(key) },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      _id?: string;
      name?: string;
      userIds?: string[];
      users?: Array<{ userId?: string }>;
    } | null;
    if (!body) return {};

    return {
      team: {
        id: body._id,
        name: body.name,
        memberCount: body.users?.length ?? body.userIds?.length,
      },
    };
  },
};

export default apiKey;
