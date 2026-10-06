import type { AuthDefinition } from "@w6w/types";
import { probeAccess } from "./_shared.ts";

/**
 * Authorization-code flow for a **private** or **public** Sellsy OAuth client
 * (OpenAPI `securitySchemes.oauth2.flows.authorizationCode`, verified
 * 2026-10-06): authorize at `login.sellsy.com/oauth2/authorization`, exchange
 * and refresh at `login.sellsy.com/oauth2/access-tokens`. **PKCE is required**
 * by Sellsy's own description of the flow, so it is on. Access tokens last an
 * hour and come with a rotating refresh token.
 *
 * The scopes are the ones the actions in this app use. A client only ever gets
 * what it was granted in the Sellsy developer page, so an action whose scope is
 * missing fails with a 403 that names the scope.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth 2.0 (authorization code)",
  description:
    "Sign in to Sellsy with a private or public OAuth client. Needs a Sellsy OAuth client " +
    "(Sellsy → Settings → API → V2 access) configured on this w6w installation.",
  oauth2: {
    authorizationUrl: "https://login.sellsy.com/oauth2/authorization",
    tokenUrl: "https://login.sellsy.com/oauth2/access-tokens",
    refreshUrl: "https://login.sellsy.com/oauth2/access-tokens",
    scopes: [
      "accounts.read",
      "companies.read",
      "companies.write",
      "individuals.read",
      "individuals.write",
      "contacts.read",
      "contacts.write",
      "opportunities.read",
      "opportunities.write",
      "tasks.read",
      "tasks.write",
      "comments.read",
      "comments.write",
      "estimates.read",
      "estimates.write",
      "invoices.read",
      "items.read",
      "payments.read",
      "staffs.read",
      "search.read",
      "webhooks.read",
      "webhooks.write",
    ],
    pkce: true,
  } as AuthDefinition["oauth2"],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  test: ({ credential }, ctx) => probeAccess(credential, ctx),
};

export default oauth2;
