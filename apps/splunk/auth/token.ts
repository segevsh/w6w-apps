import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Splunk Cloud authentication token (`apiKey`, bearer-style).
 *
 * Splunk Cloud Platform's management/REST API accepts a token minted under
 * Settings → Tokens as `Authorization: Bearer <token>` — confirmed against
 * Splunk's own token-auth documentation, which shows exactly this header
 * against a live `*.splunkcloud.com:8089` stack. This is a DIFFERENT
 * credential and header scheme from HTTP Event Collector (`Authorization:
 * Splunk <hec-token>`, on a different host entirely) — see the README for
 * why this app does not attempt HEC ingestion.
 *
 * The stack hostname is collected here rather than per-action: it identifies
 * the tenant, so it belongs to the Connection. `afterConnect` echoes it onto
 * the connection's display data, which is where the client reads it from.
 */
const token: AuthDefinition = {
  key: "token",
  type: "apiKey",
  displayName: "Stack & Auth Token",
  description:
    "Settings → Tokens → New Token in Splunk Cloud (token authentication must be enabled for the stack), then paste the stack hostname and token here.",
  connectionLabel: "{{stack}}",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "stack",
      label: "Stack hostname",
      type: "string",
      required: true,
      placeholder: "acme.splunkcloud.com",
      hint:
        "The full Splunk Cloud stack hostname (not just the short name). The management API is reached on port 8089 of this host.",
      validation: { pattern: "^[a-zA-Z0-9-]+\\.splunkcloud\\.com$" },
    },
    {
      key: "token",
      label: "Auth Token",
      type: "secret",
      required: true,
      hint: "Settings → Tokens → New Token.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { stack, token } = credential as { stack?: string; token?: string };
    if (!stack || !token) {
      return { ok: false, message: "credential missing stack or token" };
    }
    const res = await ctx.fetch(
      `${baseUrl(stack)}/services/authentication/current-context?output_mode=json`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return { ok: false, message: `Splunk returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the stack hostname on the connection so the client can build
   * URLs without ever seeing the credential.
   */
  async afterConnect({ credential }, ctx) {
    const { stack, token } = credential as { stack?: string; token?: string };
    if (!stack) return {};
    const res = await ctx.fetch(
      `${baseUrl(stack)}/services/authentication/current-context?output_mode=json`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return { stack };
    const body = await res.json().catch(() => ({})) as {
      entry?: Array<{ content?: { username?: string; realname?: string } }>;
    };
    const content = body.entry?.[0]?.content ?? {};
    return { stack, username: content.username, realname: content.realname };
  },
};

export default token;
