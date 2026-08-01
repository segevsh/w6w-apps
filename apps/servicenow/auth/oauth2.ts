import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * OAuth 2.0 against the instance's own ServiceNow host.
 *
 * Like Zendesk, ServiceNow's authorize/token endpoints live under the
 * customer's own instance, so there is no single URL this app can declare.
 * The `{instance}` placeholder below is filled in by the host from the
 * connection's `instance` field when it builds the authorize URL — which also
 * means the OAuth host is not added to the egress allowlist implicitly, and
 * `*.service-now.com` in `package.json` is what actually permits it.
 *
 * Requires an OAuth Application Registry entry created in the target
 * instance (System OAuth → Application Registry) with a Client ID/Secret
 * registered on this w6w installation. `useraccount` is the scope ServiceNow
 * itself uses for its own OAuth clients when none narrower is configured.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with ServiceNow)",
  description:
    "Requires an OAuth Application Registry entry in the target instance (System OAuth → Application Registry) and a matching client registered on this w6w installation.",
  connectionLabel: "ServiceNow ({{instance}})",
  fields: [
    {
      key: "instance",
      label: "Instance",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the instance name from `acme.service-now.com`. It selects the OAuth host too.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
  ],
  oauth2: {
    authorizationUrl: "https://{instance}.service-now.com/oauth_auth.do",
    tokenUrl: "https://{instance}.service-now.com/oauth_token.do",
    scopes: ["useraccount"],
    scopeSeparator: " ",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { instance, accessToken } = credential as {
      instance?: string;
      accessToken?: string;
    };
    if (!instance || !accessToken) {
      return { ok: false, message: "credential missing instance or accessToken" };
    }
    const res = await ctx.fetch(
      `${baseUrl(instance)}/api/now/table/sys_user_role?sysparm_limit=1`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return { ok: false, message: `ServiceNow returned ${res.status}` };
    return { ok: true };
  },

  /**
   * The exchanged token carries no username, and guessing one via a scripted
   * query would require a role this credential may not have — so this
   * records only what is already known: the instance from the collected
   * field.
   */
  afterConnect({ credential }) {
    const { instance } = credential as { instance?: string };
    return Promise.resolve(instance ? { instance } : {});
  },
};

export default oauth2;
