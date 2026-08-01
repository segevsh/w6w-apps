import type { AuthDefinition } from "@w6w/types";
import { resolveBaseUrl } from "../lib/client.ts";

/**
 * Service Account Token auth (`service-account-token`) — Grafana's current
 * recommended scheme for programmatic API access, confirmed against
 * Grafana's own docs: "Service accounts replace API keys as the primary way
 * to authenticate applications that interact with Grafana." Classic API keys
 * still work but are the legacy path; this app only offers the recommended
 * one, per the terminology Grafana itself uses today.
 *
 * A service account token is sent as `Authorization: Bearer <token>` — the
 * same header Grafana's own docs show (`Bearer glsa_...`).
 *
 * The instance has no fixed hostname — self-hosted, on-prem, and Grafana
 * Cloud instances all live at whatever URL the operator gives them — so
 * `endpoint` is collected here as a per-connection field, republished via
 * `afterConnect` onto `connection.display.endpoint` so action code (which
 * never sees the credential) can build request URLs.
 */
const serviceAccountToken: AuthDefinition = {
  key: "service-account-token",
  type: "apiKey",
  displayName: "Service Account Token",
  description: "Authenticate with a Grafana service account token (Administration → " +
    "Users and access → Service accounts → Add service account token, or " +
    "POST /api/serviceaccounts/:id/tokens). Grafana replaced classic API keys with " +
    "service accounts as the recommended way to authenticate applications.",
  connectionLabel: "{{endpoint}}",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "endpoint",
      label: "Grafana Endpoint",
      type: "string",
      required: true,
      placeholder: "https://my-stack.grafana.net",
      hint: "Base URL of the Grafana instance, without a trailing slash.",
    },
    {
      key: "token",
      label: "Service Account Token",
      type: "secret",
      required: true,
      hint: "Starts with `glsa_`. Shown only once when the token is created.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { endpoint, token } = credential as { endpoint?: string; token?: string };
    if (!endpoint || !token) {
      return { ok: false, message: "credential missing endpoint / token" };
    }
    const baseUrl = resolveBaseUrl({ endpoint });
    // `/api/org` needs only the `orgs:read` action — the narrowest privilege
    // a service account can hold — so a token scoped away from admin
    // endpoints is never reported broken just because the probe happened to
    // need more than it was granted.
    const res = await ctx.fetch(`${baseUrl}/api/org`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Grafana returned ${res.status}` };
    return { ok: true };
  },

  afterConnect({ credential }) {
    const { endpoint } = credential as { endpoint?: string };
    return { endpoint };
  },
};

export default serviceAccountToken;
