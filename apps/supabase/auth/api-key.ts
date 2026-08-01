import type { AuthDefinition } from "@w6w/types";
import { restUrl } from "../lib/client.ts";

/**
 * Project URL + API key (`apiKey`).
 *
 * Supabase's data REST API (PostgREST, mounted at `/rest/v1`) sits behind an
 * API gateway that requires the key on **two** headers at once, confirmed
 * against Supabase's own docs and a real integrator's report of the failure
 * mode (https://github.com/supabase-community/postgrest-go/issues/29):
 *
 *   - `apikey: <key>`               — read by the gateway in front of Postgres.
 *     Omit it and every call fails with 401 `"No API key found in request"`,
 *     even before PostgREST sees the request.
 *   - `Authorization: Bearer <key>` — read by PostgREST itself to resolve the
 *     Postgres role the request runs as (`anon` or `service_role`).
 *
 * Both header values are the *same* key string; there is only one field to
 * collect. Which key the user pastes changes what the connection can do:
 *
 *   - **anon** key — runs every request as Postgres role `anon` (or
 *     `authenticated`), so it is bound by whatever Row Level Security
 *     policies the project defines. Safe-by-design for the credential to be
 *     narrow; a bad policy still limits blast radius.
 *   - **service_role** key — runs as a role with `BYPASSRLS`: it can read and
 *     write every row in every table regardless of RLS policy. Supabase's own
 *     docs call exposing it "extremely dangerous" — never enter it into a
 *     workflow a browser or an untrusted caller can trigger with attacker-
 *     controlled input.
 *
 * The project URL identifies the project, so it belongs to the Connection —
 * `afterConnect` echoes it onto the connection's display data, which is where
 * `lib/client.ts` reads it from.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Project URL & API Key",
  description:
    "From your Supabase project: Settings → API. Paste the Project URL and either the `anon` " +
    "or `service_role` key — see the field hint for which one to use.",
  connectionLabel: "{{project.ref}}",
  apiKey: { in: "header", name: "apikey" },
  fields: [
    {
      key: "projectUrl",
      label: "Project URL",
      type: "string",
      required: true,
      placeholder: "https://abcdefghijklmnop.supabase.co",
      hint: "Settings → API → Project URL. The `*.supabase.co` host, no path.",
      validation: { pattern: "^https://[a-z0-9-]+\\.supabase\\.co/?$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings → API → Project API keys. Use `anon` (respects Row Level Security — the " +
        "safer default) unless this connection genuinely needs to bypass RLS, in which case use " +
        "`service_role` — and never in a workflow reachable by untrusted input, since it grants " +
        "full read/write access to every table.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // Both headers carry the same key — the gateway reads `apikey`, PostgREST
    // reads `Authorization` to resolve the Postgres role (anon/service_role).
    request.headers["apikey"] = apiKey;
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { projectUrl, apiKey } = credential as { projectUrl?: string; apiKey?: string };
    if (!projectUrl || !apiKey) {
      return { ok: false, message: "credential missing projectUrl or apiKey" };
    }
    // The PostgREST root is a cheap, table-agnostic probe: it serves the
    // auto-generated OpenAPI description when the key is valid, and the
    // gateway rejects a bad key before any table is touched either way.
    const res = await ctx.fetch(`${restUrl(projectUrl)}/`, {
      headers: { apikey: apiKey, authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Supabase returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the project URL on the connection so the client can build request
   * URLs without ever seeing the credential.
   */
  afterConnect({ credential }, _ctx) {
    const { projectUrl } = credential as { projectUrl?: string };
    if (!projectUrl) return {};
    let ref = "";
    try {
      ref = new URL(projectUrl).hostname.split(".")[0] ?? "";
    } catch {
      // leave ref blank — projectUrl still gets recorded below.
    }
    return { projectUrl, project: { ref } };
  },
};

export default apiKey;
