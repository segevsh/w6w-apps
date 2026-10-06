import type { AuthDefinition } from "@w6w/types";
import {
  businessUnitField,
  connectionDisplay,
  environmentField,
  type PardotCredential,
  stamp,
  testCredential,
} from "./shared.ts";

/**
 * Salesforce OAuth 2.0 web server flow against a connected app that carries the
 * `pardot_api` scope (authentication page: without it, "OAuth flows other than
 * username/password can't be used with the Account Engagement API"). The user
 * must be SSO-enabled for Account Engagement.
 *
 * Production and Account Engagement developer orgs both sign in at
 * `login.salesforce.com`; sandboxes use `oauth2-sandbox`. The Account Engagement
 * HOST is a separate choice (`environment`), because a developer org logs in at
 * production Salesforce but calls `pi.demo.pardot.com`.
 *
 * `refresh_token` is requested because Salesforce issues none without it.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Salesforce)",
  description:
    "Public OAuth flow via login.salesforce.com. Requires a Salesforce connected app with the pardot_api scope registered on this w6w installation.",
  connectionLabel: "Account Engagement ({{org.name}})",
  fields: [businessUnitField, environmentField],
  oauth2: {
    authorizationUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    refreshUrl: "https://login.salesforce.com/services/oauth2/token",
    scopes: ["pardot_api", "refresh_token", "offline_access"],
    pkce: true,
  },

  sign({ request, credential }) {
    return stamp(request, credential as PardotCredential);
  },

  test({ credential }, ctx) {
    return testCredential(credential as PardotCredential, ctx);
  },

  afterConnect({ credential }) {
    return connectionDisplay(credential as PardotCredential);
  },
};

export default oauth2;
