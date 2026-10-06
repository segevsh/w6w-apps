import type { AuthDefinition } from "@w6w/types";
import {
  type BraintreeCredential,
  DEFAULT_API_VERSION,
  DEFAULT_ENVIRONMENT,
  describeErrors,
  endpoint,
  type Environment,
  type GraphQLResponse,
  isAuthError,
  isEnvironment,
} from "../lib/client.ts";

/** Resolve the environment from a credential; anything unrecognised is production. */
export function envOf(cred: Partial<BraintreeCredential>): Environment {
  const e = (cred.environment ?? "").trim();
  return isEnvironment(e) ? e : DEFAULT_ENVIRONMENT;
}

export function versionOf(cred: Partial<BraintreeCredential>): string {
  const v = (cred.apiVersion ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : DEFAULT_API_VERSION;
}

/** `base64(publicKey:privateKey)` — the Braintree GraphQL API's Basic credential. */
export function basicToken(cred: Partial<BraintreeCredential>): string {
  return btoa(`${(cred.publicKey ?? "").trim()}:${(cred.privateKey ?? "").trim()}`);
}

export function authHeaders(cred: Partial<BraintreeCredential>): Record<string, string> {
  return {
    authorization: `Basic ${basicToken(cred)}`,
    "braintree-version": versionOf(cred),
  };
}

/**
 * API key — a Braintree public/private key pair, sent as HTTP Basic
 * (`base64(publicKey:privateKey)`) with a `Braintree-Version` date header. Keys belong to one
 * environment (sandbox or production); a sandbox key is rejected by the production host and
 * vice versa.
 */
const apiKeys: AuthDefinition = {
  key: "api-keys",
  type: "custom",
  displayName: "API keys (public + private)",
  description:
    "Braintree Control Panel > Settings > API > API Keys. Sandbox and production are separate accounts with separate keys. Sent as HTTP Basic plus a Braintree-Version header.",
  connectionLabel: "Braintree ({{environment}})",
  fields: [
    {
      key: "environment",
      label: "Environment",
      type: "select",
      required: true,
      default: DEFAULT_ENVIRONMENT,
      options: [
        { value: "production", label: "Production" },
        { value: "sandbox", label: "Sandbox" },
      ],
      hint: "Keys only work in the environment they were created in.",
    },
    {
      key: "publicKey",
      label: "Public key",
      type: "secret",
      required: true,
      hint: "From Settings > API > API Keys. Half of the credential; stored encrypted.",
    },
    {
      key: "privateKey",
      label: "Private key",
      type: "secret",
      required: true,
      hint: "Shown once when the key is generated. It can move money; use a user with only the " +
        "permissions this workflow needs.",
    },
    {
      key: "apiVersion",
      label: "Braintree-Version",
      type: "string",
      default: DEFAULT_API_VERSION,
      placeholder: DEFAULT_API_VERSION,
      hint: "A YYYY-MM-DD date sent as the Braintree-Version header. Leave the default unless " +
        "you need a newer schema.",
    },
  ],

  /** The only hook handed the raw credential; runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<BraintreeCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Probe: signed `query { ping }`. The API answers HTTP 200 for everything, so the verdict is
   * read from the body: `data.ping === "pong"` is valid; an AUTHENTICATION-class error is a
   * rejected key (a missing and an invalid key carry different messages, both AUTHENTICATION).
   * Anything else is not trusted as a pass.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<BraintreeCredential>;
    if (!(cred?.publicKey ?? "").trim()) {
      return { ok: false, message: "credential missing publicKey" };
    }
    if (!(cred?.privateKey ?? "").trim()) {
      return { ok: false, message: "credential missing privateKey" };
    }
    const env = envOf(cred);

    let res: Response;
    try {
      res = await ctx.fetch(endpoint(env), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...authHeaders(cred),
        },
        body: JSON.stringify({ query: "query { ping }" }),
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Braintree ${env} API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: GraphQLResponse<{ ping?: string }> | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* not JSON: the request probably never reached Braintree */ }

    if (!body || typeof body !== "object") {
      return {
        ok: false,
        message: `Braintree ${env} answered HTTP ${res.status} with a non-JSON body`,
      };
    }
    if (body.data?.ping === "pong" && !body.errors?.length) return { ok: true };
    if (isAuthError(body)) {
      return {
        ok: false,
        message: `Braintree rejected the keys on the ${env} endpoint (${
          describeErrors(body.errors ?? [])
        }). Check the environment matches where the keys were created.`,
      };
    }
    if (body.errors?.length) return { ok: false, message: describeErrors(body.errors) };
    return { ok: false, message: `unexpected answer to \`ping\` (HTTP ${res.status})` };
  },

  /** Publish the environment so actions and health checks can pick the host. */
  afterConnect({ credential }) {
    return { environment: envOf(credential as Partial<BraintreeCredential>) };
  },
};

export default apiKeys;
