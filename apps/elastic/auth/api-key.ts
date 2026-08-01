import type { AuthDefinition } from "@w6w/types";
import { encodeBase64, resolveBaseUrl } from "../lib/client.ts";

/**
 * API Key auth (`api-key`) — Elastic's recommended scheme for programmatic
 * access, confirmed against Elastic's own API key authentication docs: send
 * `Authorization: ApiKey <credentials>`, where `<credentials>` is the
 * base64-encoding of the API key's `id` and `api_key` (the "encoded" value
 * Kibana shows you is exactly this pair pre-joined) joined by a colon.
 *
 * The cluster has no fixed hostname — self-hosted, on-prem, and Elastic
 * Cloud deployments all live at whatever URL the operator gives them — so
 * `endpoint` is collected here as a per-connection field, republished via
 * `afterConnect` onto `connection.display.endpoint` so action code (which
 * never sees the credential) can build request URLs.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Authenticate with an Elasticsearch API key (Kibana: Stack Management → " +
    "API Keys → Create API key, or POST /_security/api_key). The key ID and the secret " +
    "are two separate values Elastic hands you — both are required here.",
  connectionLabel: "{{endpoint}}",
  apiKey: { in: "header", name: "Authorization", prefix: "ApiKey " },
  fields: [
    {
      key: "endpoint",
      label: "Elasticsearch Endpoint",
      type: "string",
      required: true,
      placeholder: "https://my-cluster.es.us-central1.gcp.cloud.es.io:9243",
      hint: "Base URL of the cluster, without a trailing slash.",
    },
    {
      key: "apiKeyId",
      label: "API Key ID",
      type: "secret",
      required: true,
      hint: "The `id` returned when the API key was created.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "The `api_key` secret returned when the key was created (shown only once).",
    },
  ],

  sign({ request, credential }) {
    const { apiKeyId, apiKey: secret } = credential as { apiKeyId: string; apiKey: string };
    request.headers["authorization"] = `ApiKey ${encodeBase64(`${apiKeyId}:${secret}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { endpoint, apiKeyId, apiKey: secret } = credential as {
      endpoint?: string;
      apiKeyId?: string;
      apiKey?: string;
    };
    if (!endpoint || !apiKeyId || !secret) {
      return { ok: false, message: "credential missing endpoint / apiKeyId / apiKey" };
    }
    const baseUrl = resolveBaseUrl({ endpoint });
    const token = encodeBase64(`${apiKeyId}:${secret}`);
    // `/_security/_authenticate` is Elasticsearch's "whoami" — it needs no
    // privilege beyond being authenticated, so it can't report a working key
    // broken just because it was scoped away from cluster-admin endpoints.
    const res = await ctx.fetch(`${baseUrl}/_security/_authenticate`, {
      headers: { authorization: `ApiKey ${token}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Elasticsearch returned ${res.status}` };
    return { ok: true };
  },

  afterConnect({ credential }) {
    const { endpoint } = credential as { endpoint?: string };
    return { endpoint };
  },
};

export default apiKey;
