import type { AuthDefinition } from "@w6w/types";
import { encodeBase64, resolveBaseUrl } from "../lib/client.ts";

/**
 * Basic auth (`basic`) — Jenkins' own remote API docs document HTTP Basic
 * with a username + a personal API token (user menu → Configure → API
 * Token → "Add new Token") as the supported scheme for scripted/remote
 * clients; a token is explicitly preferred over the account password.
 *
 * This also settles the CSRF question for this app: Jenkins' CSRF
 * documentation (`security/csrf-protection`) states plainly that "requests
 * authenticating with an API token are exempt from CSRF protection in
 * Jenkins." Every write this app performs authenticates with exactly that
 * — username + API token via HTTP Basic — so no crumb (`/crumbIssuer/api/json`)
 * needs to be fetched or attached. See the README for the full reasoning.
 *
 * `endpoint` is per-connection, same as `elastic`/`wordpress` — Jenkins is
 * almost always self-hosted at an arbitrary domain, so there is no fixed API
 * host to allowlist (see `lib/client.ts`).
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Username & API Token",
  description: "HTTP Basic auth using a Jenkins username and personal API token " +
    "(user menu → Configure → API Token → Add new Token). Jenkins documents a token as " +
    "preferred over the account password, and exempts token-authenticated requests from " +
    "its CSRF crumb requirement.",
  connectionLabel: "{{username}} @ {{endpoint}}",
  fields: [
    {
      key: "endpoint",
      label: "Jenkins URL",
      type: "string",
      required: true,
      placeholder: "https://ci.example.com",
      hint: "Base URL of the Jenkins instance, without a trailing slash.",
    },
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Generated on the user's Configure page — not the account password.",
    },
  ],

  sign({ request, credential }) {
    const { username, apiToken } = credential as { username: string; apiToken: string };
    request.headers["authorization"] = `Basic ${encodeBase64(`${username}:${apiToken}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { endpoint, username, apiToken } = credential as {
      endpoint?: string;
      username?: string;
      apiToken?: string;
    };
    if (!endpoint || !username || !apiToken) {
      return { ok: false, message: "credential missing endpoint / username / apiToken" };
    }
    const baseUrl = resolveBaseUrl({ endpoint });
    const token = encodeBase64(`${username}:${apiToken}`);
    // `/api/json` is the cheapest authenticated read on any Jenkins instance
    // — the top-level Jenkins model (jobs, views, etc), which every logged-in
    // user can see regardless of per-job permissions.
    const res = await ctx.fetch(`${baseUrl}/api/json`, {
      headers: { authorization: `Basic ${token}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Jenkins returned ${res.status}` };
    return { ok: true };
  },

  afterConnect({ credential }) {
    const { endpoint, username } = credential as { endpoint?: string; username?: string };
    return { endpoint, username };
  },
};

export default basic;
