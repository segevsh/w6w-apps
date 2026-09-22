import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Lofty API key — `Authorization: token <API_KEY>`.
 *
 * ## The prefix is the literal word `token`
 *
 * Lofty's Getting Started page
 * (<https://api.lofty.com/docs/intro>, section "2. API Key (Use with Caution)")
 * documents the header verbatim as `Authorization: token [API_KEY]` — lowercase
 * `token`, **not** `Bearer`. That is the whole reason this is a declared
 * `apiKey` auth with its own `sign` hook rather than a generic bearer: a
 * `Bearer` prefix is rejected, and the failure looks like a bad key.
 *
 * The key is generated in a Lofty account at Settings > Integrations > API.
 *
 * ## The probe is the whoami, and it returns no credential
 *
 * `GET /v1.0/me` answers a `UserResponse` — `id`, `teamId`, `roleName`,
 * `email`, `firstName`, `assignedLeadCount` and so on. There is no key, token
 * or secret anywhere in that shape, so it is safe to store the probe's result
 * in the health surface. (Lofty's own docs mark the API-key method "use with
 * caution" precisely because the key is a long-lived account credential; not
 * echoing it back is the whole point of choosing this endpoint.)
 *
 * ## Validity is read from the BODY, not the status code
 *
 * A rejected request answers a JSON *string* body (`"<error message>"`), while
 * a valid one answers an object with an `id`. {@link apiKey.test} therefore
 * judges the parsed body: only a `UserResponse`-shaped object counts as live.
 * A `200` that is not a profile is a failure, and a `401` is reported with
 * Lofty's own message.
 */

export interface LoftyCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built — `sign`, `test` and `afterConnect`
 * all reuse it, so a probe can never send a header real requests do not.
 */
export function authHeaders(credential: Partial<LoftyCredential>): Record<string, string> {
  return { authorization: `token ${credential.apiKey ?? ""}` };
}

/** The credential-liveness probe: the whoami, which needs no scope beyond the key. */
export const PROBE_PATH = "/me";

/**
 * Lofty's failure body is a JSON string rather than an object. Unwrap it for
 * the message; leave anything else as served.
 */
export function errorDetail(text: string): string {
  const detail = text.trim();
  if (!detail) return "";
  try {
    const parsed = JSON.parse(detail) as unknown;
    return typeof parsed === "string" ? parsed : detail;
  } catch {
    return detail;
  }
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste the API key from your Lofty account (Settings > Integrations > API). Lofty sends it " +
    "as `Authorization: token <key>`.",
  connectionLabel: "Lofty ({{firstName}} {{lastName}})",
  apiKey: { in: "header", name: "authorization" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Lofty > Settings > Integrations > API. The key is a long-lived account credential, " +
        "so give this connection a dedicated key rather than a shared one.",
    },
  ],

  /**
   * The only hook handed the raw credential. Runs network-less: it stamps the
   * `token ` header and returns. The key never reaches a URL or a body.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<LoftyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See the module docs: the whoami, classified from the body. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<LoftyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${API_BASE}: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }

    const profile = body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : undefined;

    // Classified from the body: only a real UserResponse counts as live.
    if (profile && profile.id !== undefined) {
      const who = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
      const team = profile.teamId !== undefined ? `, team ${profile.teamId}` : "";
      return {
        ok: true,
        message: who
          ? `connected as ${who}${team}`
          : `connected — the API key resolves to member ${profile.id}${team}`,
      };
    }

    const detail = errorDetail(text);
    if (!res.ok) {
      return {
        ok: false,
        message: `Lofty rejected the API key (HTTP ${res.status}${detail ? `: ${detail}` : ""})`,
      };
    }
    return {
      ok: false,
      message: `HTTP ${res.status} from GET ${PROBE_PATH} did not return a user profile` +
        `${detail ? `: ${detail}` : ""} — Lofty answered, but not as this key's account`,
    };
  },

  /**
   * Publish a display name, and nothing else.
   *
   * A list of Connections that all read "Lofty" is unusable, and Lofty's
   * `UserResponse` carries the two name fields worth showing. Nothing else is
   * kept — in particular the probe's result is never stored wholesale.
   *
   * A failure here is deliberately silent: `test` has already established the
   * key is live, and a missing label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<LoftyCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { firstName?: string; lastName?: string };
      const firstName = body?.firstName;
      const lastName = body?.lastName;
      if (!firstName && !lastName) return {};
      return { firstName, lastName };
    } catch {
      return {};
    }
  },
};

export default apiKey;
