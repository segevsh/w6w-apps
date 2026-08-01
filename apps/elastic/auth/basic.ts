import type { AuthDefinition } from "@w6w/types";
import { encodeBase64, resolveBaseUrl } from "../lib/client.ts";

/**
 * Basic auth (`basic`) — HTTP Basic against a native-realm (or any
 * realm-backed) Elasticsearch user: username + password, base64-encoded per
 * RFC 7617. Elastic documents this as a supported scheme alongside API keys;
 * API keys are the recommended path for new integrations (see `./api-key.ts`)
 * but plenty of self-hosted clusters are only set up with native users.
 *
 * `endpoint` is per-connection, same as `api-key` — see that file's comment
 * for why there is no fixed API host to allowlist.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Username & Password",
  description: "HTTP Basic auth against a native (or realm-backed) Elasticsearch user.",
  connectionLabel: "{{username}} @ {{endpoint}}",
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
      key: "username",
      label: "Username",
      type: "string",
      required: true,
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      required: true,
    },
  ],

  sign({ request, credential }) {
    const { username, password } = credential as { username: string; password: string };
    request.headers["authorization"] = `Basic ${encodeBase64(`${username}:${password}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { endpoint, username, password } = credential as {
      endpoint?: string;
      username?: string;
      password?: string;
    };
    if (!endpoint || !username || !password) {
      return { ok: false, message: "credential missing endpoint / username / password" };
    }
    const baseUrl = resolveBaseUrl({ endpoint });
    const token = encodeBase64(`${username}:${password}`);
    // Same "whoami" endpoint as api-key.ts — no privilege beyond authenticating.
    const res = await ctx.fetch(`${baseUrl}/_security/_authenticate`, {
      headers: { authorization: `Basic ${token}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Elasticsearch returned ${res.status}` };
    return { ok: true };
  },

  afterConnect({ credential }) {
    const { endpoint, username } = credential as { endpoint?: string; username?: string };
    return { endpoint, username };
  },
};

export default basic;
