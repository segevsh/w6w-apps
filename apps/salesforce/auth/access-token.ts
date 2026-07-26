import type { AuthDefinition } from "@w6w/types";
import { DATA_PATH } from "../lib/client.ts";

/**
 * Instance URL + access token (`bearer`).
 *
 * The direct path: paste an org's My Domain URL and a session / access token.
 * Useful for a connected app you already mint tokens for, and for sandboxes,
 * without registering OAuth client credentials on this w6w installation.
 *
 * Salesforce session tokens are short-lived. For anything long-running prefer
 * the `oauth2` method, which the host can refresh.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Instance URL & Access Token",
  description:
    "Paste your org's My Domain URL and an access token. Short-lived — prefer OAuth for scheduled work.",
  connectionLabel: "{{org.name}}",
  fields: [
    {
      key: "instanceUrl",
      label: "Instance URL",
      type: "string",
      required: true,
      placeholder: "https://acme.my.salesforce.com",
      hint: "Your org's My Domain URL, including https:// and with no trailing path.",
      validation: { pattern: "^https://[A-Za-z0-9.-]+$" },
    },
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "A session id or OAuth access token for that org.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { instanceUrl, accessToken } = credential as {
      instanceUrl?: string;
      accessToken?: string;
    };
    if (!instanceUrl || !accessToken) {
      return { ok: false, message: "credential missing instanceUrl or accessToken" };
    }
    const res = await ctx.fetch(`${instanceUrl.replace(/\/+$/, "")}${DATA_PATH}/limits`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Salesforce returned ${res.status}` };
    return { ok: true };
  },

  /** Records the instance URL so the client can address the org. */
  afterConnect({ credential }) {
    const { instanceUrl } = credential as { instanceUrl?: string };
    if (!instanceUrl) return {};
    const clean = instanceUrl.replace(/\/+$/, "");
    return {
      instanceUrl: clean,
      org: { name: new URL(clean).hostname.split(".")[0] },
    };
  },
};

export default accessToken;
