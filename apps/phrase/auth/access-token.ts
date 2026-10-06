import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX, HOSTS, regionOf, USER_AGENT } from "../lib/client.ts";

/**
 * Phrase Strings access token — `Authorization: token <access_token>`.
 *
 * Verified against the OpenAPI `securitySchemes.Token` ("Enter your token in the
 * format `token TOKEN`") and the developer hub's Authentication page. Phrase also
 * accepts HTTP Basic (email + password, or the token as the username) and an
 * `?access_token=` query parameter; this app uses neither — the header is the only
 * form, so a token never lands in a logged URL. Tokens are created under
 * Profile settings > Access tokens, or via the Authorizations API.
 *
 * ## Region
 *
 * A token belongs to one data centre. The connection therefore carries a `region`
 * (EU `api.phrase.com`, US `api.us.app.phrase.com`); `afterConnect` publishes it so
 * Actions can pick the host without ever seeing the credential.
 *
 * ## Probe: `GET /v2/user`
 *
 * Chosen by reading the response schema: it needs a credential, is not scoped to a
 * project, and returns `{id, username, name, email, position, language, …}` — no
 * credential material, unlike a whoami that echoes a key. A 401 comes back with an
 * EMPTY `text/html` body (measured on both hosts with a fake token), so there is no
 * vendor error code to read; a pass therefore requires the documented JSON shape
 * (`id` present), never merely a 2xx.
 */

export interface PhraseCredential {
  accessToken: string;
  region?: string;
}

export const PROBE_PATH = "/user";

/** The one place the wire format is built, shared by `sign` and the probes. */
export function authHeaders(credential: Partial<PhraseCredential>): Record<string, string> {
  return { authorization: `token ${credential.accessToken ?? ""}` };
}

async function whoami(
  credential: Partial<PhraseCredential>,
  ctx: { fetch: typeof fetch },
): Promise<Response> {
  const host = HOSTS[regionOf(credential.region)];
  return await ctx.fetch(`${host}${API_PREFIX}${PROBE_PATH}`, {
    headers: {
      accept: "application/json",
      "user-agent": USER_AGENT,
      ...authHeaders(credential),
    },
  });
}

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "apiKey",
  displayName: "Access Token",
  description:
    "A Phrase Strings access token, plus the data centre it was created in. Create one under " +
    "Profile settings > Access tokens; give it only the scopes the workflows need.",
  connectionLabel: "Phrase Strings ({{region}})",
  apiKey: { in: "header", name: "Authorization", prefix: "token " },
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Profile settings > Access tokens. Sent as `Authorization: token <value>`.",
    },
    {
      key: "region",
      label: "Data center",
      type: "select",
      required: true,
      default: "eu",
      options: [
        { value: "eu", label: "EU — api.phrase.com" },
        { value: "us", label: "US — api.us.app.phrase.com" },
      ],
      hint: "The data centre your Phrase account lives in (see the app URL: eu.phrase.com or " +
        "us.phrase.com). A token is rejected by the other host exactly as a wrong token is.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<PhraseCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<PhraseCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };
    const region = regionOf(cred.region);

    const res = await whoami({ ...cred, accessToken: token }, ctx);
    if (res.ok) {
      const body = await res.json().catch(() => null) as { id?: string } | null;
      if (body && typeof body.id === "string") return { ok: true };
      return {
        ok: false,
        message: `Phrase (${region}) answered ${res.status} but not with a user object — ` +
          "that is not the documented GET /v2/user shape",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Phrase (${region}) rejected the token (401). Check it was copied exactly, ` +
          "has not been revoked, and that the data centre is the one the token was created in.",
      };
    }
    if (res.status === 403) {
      return { ok: false, message: "Phrase refused the user read (403) — the token lacks scope." };
    }
    if (res.status === 429) {
      return { ok: false, message: "Phrase rate-limited the check (429); retry shortly." };
    }
    return { ok: false, message: `Phrase (${region}) returned HTTP ${res.status} for /user` };
  },

  /**
   * Publish the region and the username. A failure is silent: `test` already
   * proved the token, and a missing label must not fail a good connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<PhraseCredential>;
    const region = regionOf(cred.region);
    try {
      const res = await whoami(cred, ctx);
      if (!res.ok) return { region };
      const body = await res.json() as { username?: string };
      return body?.username ? { region, username: body.username } : { region };
    } catch {
      return { region };
    }
  },
};

export default accessToken;
