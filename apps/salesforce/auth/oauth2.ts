import type { AuthDefinition } from "@w6w/types";

/**
 * OAuth 2.0 web server flow with a Salesforce connected app.
 *
 * Salesforce returns the org's `instance_url` alongside the token — that is
 * where every subsequent API call goes, and it differs per org, so
 * `afterConnect` lifts it out of the credential onto the connection's display
 * for `lib/client.ts` to read.
 *
 * The endpoints below are production (`login.salesforce.com`). A sandbox
 * authorises against `test.salesforce.com`; both are covered by the
 * `*.salesforce.com` entry on the egress allowlist, so a sandbox variant of
 * this app only has to change these two URLs.
 *
 * `refresh_token` is in the scope list because Salesforce issues no refresh
 * token without it, which would strand scheduled runs when the session expires.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Salesforce)",
  description:
    "Public OAuth flow. Requires a Salesforce connected app registered on this w6w installation.",
  connectionLabel: "{{user.name}} ({{org.name}})",
  oauth2: {
    authorizationUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    refreshUrl: "https://login.salesforce.com/services/oauth2/token",
    // Without refresh_token Salesforce issues none, and the connection dies
    // with the session.
    scopes: ["api", "refresh_token", "offline_access"],
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as {
      accessToken?: string;
      instanceUrl?: string;
      instance_url?: string;
    };
    const instance = cred.instanceUrl ?? cred.instance_url;
    if (!cred.accessToken || !instance) {
      return { ok: false, message: "credential missing accessToken or instance URL" };
    }
    const res = await ctx.fetch(
      `${instance.replace(/\/+$/, "")}/services/oauth2/userinfo`,
      { headers: { authorization: `Bearer ${cred.accessToken}`, accept: "application/json" } },
    );
    if (!res.ok) return { ok: false, message: `Salesforce returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Salesforce names the field `instance_url` in the token response; a host
   * that camel-cases it would produce `instanceUrl`. Both are accepted rather
   * than betting on one.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as { instanceUrl?: string; instance_url?: string };
    const instance = (cred.instanceUrl ?? cred.instance_url)?.replace(/\/+$/, "");
    if (!instance) return {};

    const res = await ctx.fetch(`${instance}/services/oauth2/userinfo`);
    if (!res.ok) return { instanceUrl: instance };
    const me = await res.json().catch(() => ({})) as {
      user_id?: string;
      name?: string;
      email?: string;
      organization_id?: string;
    };
    return {
      instanceUrl: instance,
      user: { id: me.user_id, name: me.name, email: me.email },
      org: { id: me.organization_id, name: new URL(instance).hostname.split(".")[0] },
    };
  },
};

export default oauth2;
