import type { AuthDefinition } from "@w6w/types";
import { API_PATH } from "../lib/client.ts";

/**
 * Email + API token (`basic`).
 *
 * Atlassian Cloud's Basic auth takes the account email as the username and an
 * API token — not the account password, which Atlassian disabled for the API —
 * as the password.
 *
 * The site name is collected here rather than per-action: it identifies the
 * Jira instance, so it belongs to the Connection.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "basic",
  displayName: "Email & API Token",
  description:
    "Create a token at id.atlassian.com → Security → API tokens, then pair it with your account email.",
  connectionLabel: "{{user.displayName}} ({{site}})",
  fields: [
    {
      key: "site",
      label: "Site",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the name from `acme.atlassian.net` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    { key: "email", label: "Email", type: "string", required: true, row: "creds" },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      row: "creds",
      hint: "id.atlassian.com → Security → Create and manage API tokens.",
    },
  ],

  sign({ request, credential }) {
    const { email, apiToken } = credential as { email: string; apiToken: string };
    request.headers["authorization"] = `Basic ${btoa(`${email}:${apiToken}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { site, email, apiToken } = credential as {
      site?: string;
      email?: string;
      apiToken?: string;
    };
    if (!site || !email || !apiToken) {
      return { ok: false, message: "credential missing site, email or apiToken" };
    }
    const res = await ctx.fetch(`https://${site}.atlassian.net${API_PATH}/myself`, {
      headers: {
        authorization: `Basic ${btoa(`${email}:${apiToken}`)}`,
        accept: "application/json",
      },
    });
    if (!res.ok) return { ok: false, message: `Jira returned ${res.status}` };
    return { ok: true };
  },

  /** Records the site so the client can build URLs without the credential. */
  async afterConnect({ credential }, ctx) {
    const { site } = credential as { site?: string };
    if (!site) return {};
    const res = await ctx.fetch(`https://${site}.atlassian.net${API_PATH}/myself`);
    if (!res.ok) return { site };
    const me = await res.json().catch(() => ({})) as {
      accountId?: string;
      displayName?: string;
      emailAddress?: string;
    };
    return {
      site,
      user: { id: me.accountId, displayName: me.displayName, email: me.emailAddress },
    };
  },
};

export default apiToken;
