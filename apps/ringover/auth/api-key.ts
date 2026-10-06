import type { AuthDefinition } from "@w6w/types";
import { API_URLS, errorText, type Region } from "../lib/client.ts";

interface StoredCredential {
  apiKey: string;
  region?: string;
}

const regionOf = (c: Partial<StoredCredential>): Region => c.region === "us" ? "us" : "eu";

/**
 * API key — Ringover sends the key bare: `Authorization: <key>` (NOT `Bearer`; a `Bearer`-prefixed
 * key is answered `{"error":"Missing API key"}`, measured 2026-10-06). Keys are created in the
 * Ringover dashboard under Developer > API Keys, bound to a user, with a Read/Write permission per
 * category (Calls, Contacts, Users, Numbers, IVRs, Conversations, ...) and a Monitoring toggle that
 * widens scope from the key owner's own data to the whole team's.
 *
 * `region` is collected next to the key because Ringover runs two hosts and offers no way to
 * discover a team's region from a key.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Create a key in the Ringover dashboard under Developer > API Keys. Sent as `Authorization: <key>` with no prefix.",
  connectionLabel: "{{team}} ({{region}})",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "eu",
      options: [
        { value: "eu", label: "Europe (public-api.ringover.com)" },
        { value: "us", label: "United States (public-api-us.ringover.com)" },
      ],
      hint: "Where your Ringover team is hosted.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Developer > API Keys in the Ringover dashboard. Give it the permissions you need.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as StoredCredential;
    request.headers["authorization"] = apiKey;
    return request;
  },

  /**
   * Probe: `GET /teams` — "No specific permission required", so a live key always passes whatever
   * its Read/Write grants. It returns the team (`team_id`, `name`, users, numbers), never the key.
   * The verdict is read from the BODY: a 2xx must carry a numeric `team_id`; a rejection is the
   * vendor's `{"error": "Invalid user"}` / `{"error": "Missing API key"}`, whose text is surfaced.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<StoredCredential>;
    if (!cred.apiKey) return { ok: false, message: "credential missing apiKey" };
    const region = regionOf(cred);

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URLS[region]}/teams`, {
        headers: { authorization: cred.apiKey, accept: "application/json" },
      });
    } catch (e) {
      return {
        ok: false,
        message: `could not reach the Ringover ${region.toUpperCase()} API: ${e}`,
      };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Ringover */ }

    if (res.ok) {
      return typeof (body as { team_id?: unknown } | null)?.team_id === "number" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /teams — no team in it`,
      };
    }
    const text = errorText(body);
    if (typeof (body as { error?: unknown } | null)?.error !== "string") {
      return {
        ok: false,
        message:
          `Ringover returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    if (res.status >= 500) {
      return { ok: false, message: `Ringover is erroring (${res.status}): ${text}` };
    }
    return {
      ok: false,
      message: res.status === 401
        ? `${text} — check the key and that the Region matches where your team is hosted`
        : text,
    };
  },

  /** Records the region (the only place a non-secret field survives) and the team name. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<StoredCredential>;
    const region = regionOf(cred);
    let team = "Ringover";
    try {
      const res = await ctx.fetch(`${API_URLS[region]}/teams`, {
        headers: { authorization: cred.apiKey ?? "", accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json() as { name?: string };
        if (body.name) team = body.name;
      }
    } catch { /* the label falls back to "Ringover" */ }
    return { region, team };
  },
};

export default apiKey;
