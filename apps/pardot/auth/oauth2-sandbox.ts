import type { AuthDefinition } from "@w6w/types";
import {
  businessUnitField,
  connectionDisplay,
  type PardotCredential,
  stamp,
  testCredential,
} from "./shared.ts";

/**
 * The same flow as `oauth2`, signing in at `test.salesforce.com` — the sandbox
 * login (authentication page, "Account Type" table). A sandbox's Account
 * Engagement is always on `pi.demo.pardot.com`, so there is no environment
 * choice here: the `test` and `afterConnect` hooks pin `environment` to `demo`.
 */
const oauth2Sandbox: AuthDefinition = {
  key: "oauth2-sandbox",
  type: "oauth2",
  displayName: "OAuth (Salesforce sandbox)",
  description:
    "OAuth via test.salesforce.com for a Salesforce sandbox. Calls go to pi.demo.pardot.com.",
  connectionLabel: "Account Engagement sandbox ({{org.name}})",
  fields: [businessUnitField],
  oauth2: {
    authorizationUrl: "https://test.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://test.salesforce.com/services/oauth2/token",
    refreshUrl: "https://test.salesforce.com/services/oauth2/token",
    scopes: ["pardot_api", "refresh_token", "offline_access"],
    pkce: true,
  },

  sign({ request, credential }) {
    return stamp(request, credential as PardotCredential);
  },

  test({ credential }, ctx) {
    return testCredential({ ...(credential as PardotCredential), environment: "demo" }, ctx);
  },

  afterConnect({ credential }) {
    return connectionDisplay({ ...(credential as PardotCredential), environment: "demo" });
  },
};

export default oauth2Sandbox;
