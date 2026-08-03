import type { AuthDefinition } from "@w6w/types";
import { API_HOSTS, baseUrl, DEFAULT_REGION, hostForRegion } from "../lib/client.ts";

/**
 * API Key (`apiKey`, header-located).
 *
 * Jotform's docs list three ways to authenticate: `?apiKey={myApiKey}` in the
 * query string, an `APIKEY: {myApiKey}` request header, and the browser JS SDK.
 * The header is used here — it keeps the credential out of URLs, request logs
 * and the `Referer`, and the docs' own examples show it working verbatim
 * (`curl -H "APIKEY: {myApiKey}" "https://api.jotform.com/user"`). Jotform's
 * official Python client uses the same header; the Node client uses the query
 * param. Both were checked; the header form is confirmed accepted live.
 *
 * Mint a key at My Account -> API -> Create New Key. A key can be issued
 * read-only or full-access, and the daily call allowance is metered per
 * ACCOUNT, not per key — every key on an account shares one budget, which is
 * why the `quota` check reports a per-connection figure.
 *
 * The **region** is collected here rather than per-action because it identifies
 * the account, not the call: an account lives on exactly one of Jotform's three
 * API hosts. `afterConnect` echoes the resolved host onto the Connection's
 * display data, which is where `lib/client.ts` reads it from — so an Action
 * gets the right host without ever seeing the credential.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from My Account -> API -> Create New Key. Sent as the `APIKEY` header on every request.",
  connectionLabel: "{{user.username}}",
  apiKey: { in: "header", name: "APIKEY" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Jotform -> My Account -> API -> Create New Key.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: DEFAULT_REGION,
      hint:
        "Which Jotform API host your account lives on. Use EU for data-residency accounts and HIPAA for HIPAA-compliant accounts. Enterprise instances on a custom domain are not supported.",
      options: [
        { value: "us", label: `Default (${API_HOSTS.us})` },
        { value: "eu", label: `EU (${API_HOSTS.eu})` },
        { value: "hipaa", label: `HIPAA (${API_HOSTS.hipaa})` },
      ],
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["apikey"] = apiKey;
    return request;
  },

  /**
   * `GET /user` — the account whoami. Jotform API keys carry no per-resource
   * scopes a credential could legitimately lack (only a read-only/full-access
   * distinction, and `/user` is a read), so this is both the cheapest call
   * available and a genuine liveness probe.
   */
  async test({ credential }, ctx) {
    const { apiKey, region } = credential as { apiKey?: string; region?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${baseUrl(hostForRegion(region))}/user`, {
      headers: { accept: "application/json", apikey: apiKey },
    });
    const body = await res.json().catch(() => null) as { message?: string } | null;
    if (!res.ok) {
      return { ok: false, message: body?.message ?? `Jotform returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Records the account's API host on the Connection so actions can build URLs
   * without the credential, plus the username for the connection label.
   */
  async afterConnect({ credential }, ctx) {
    const { region } = credential as { region?: string };
    const apiHost = hostForRegion(region);
    const res = await ctx.fetch(`${baseUrl(apiHost)}/user`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { region: region ?? DEFAULT_REGION, apiHost };
    const body = await res.json().catch(() => ({})) as { content?: Record<string, unknown> };
    return { region: region ?? DEFAULT_REGION, apiHost, user: body.content ?? {} };
  },
};

export default apiKey;
