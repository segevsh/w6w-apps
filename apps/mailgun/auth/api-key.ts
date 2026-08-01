import type { AuthDefinition } from "@w6w/types";
import { apiHost, type MailgunRegion } from "../lib/client.ts";

/**
 * Private API key (`basic`).
 *
 * Mailgun's scheme is HTTP Basic with a FIXED, literal username: `api`. The
 * password is the account's private API key. There is no per-user identity in
 * the username the way Zendesk's `{email}/token` carries one — every key
 * authenticates as `api`.
 *
 * The region is collected here rather than per-action: Mailgun runs two
 * completely separate deployments on different hosts (`api.mailgun.net` and
 * `api.eu.mailgun.net`), and a domain created in one region only ever answers
 * on that region's host. `afterConnect` echoes the region onto the
 * connection's display data, which is where the client (and every action)
 * reads it from — never from the credential.
 */
const apiKeyAuth: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "Private API Key",
  description:
    "Control Panel → Settings → API Keys → Private API key. The literal username is always `api`.",
  connectionLabel: "Mailgun ({{region}})",
  fields: [
    {
      key: "apiKey",
      label: "Private API Key",
      type: "secret",
      required: true,
      hint: "Control Panel → Settings → API Keys → Private API key.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "us",
      hint:
        "Where the sending domain(s) were created. Mailgun serves US and EU from separate hosts.",
      options: [
        { value: "us", label: "United States (api.mailgun.net)" },
        { value: "eu", label: "Europe (api.eu.mailgun.net)" },
      ],
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // Username is always the literal string "api" — the key itself is the password.
    request.headers["authorization"] = `Basic ${btoa(`api:${apiKey}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey, region } = credential as { apiKey?: string; region?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const host = apiHost(region === "eu" ? "eu" : "us");
    // Cheapest authenticated call: list domains, one row.
    const res = await ctx.fetch(`https://${host}/v4/domains?limit=1`, {
      headers: { authorization: `Basic ${btoa(`api:${apiKey}`)}` },
    });
    if (!res.ok) return { ok: false, message: `Mailgun returned ${res.status}` };
    return { ok: true };
  },

  /** Records the region on the connection so the client can pick a host without ever seeing the credential. */
  afterConnect({ credential }) {
    const { region } = credential as { region?: string };
    const normalized: MailgunRegion = region === "eu" ? "eu" : "us";
    return { region: normalized };
  },
};

export default apiKeyAuth;
