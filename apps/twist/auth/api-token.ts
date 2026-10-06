import type { AuthDefinition } from "@w6w/types";
import { bearer } from "./headers.ts";
import { probe, whoLabel } from "./probe.ts";

/**
 * Twist personal test token. Created by registering an integration at
 * https://twist.com/integrations/build, then copying the token from the integration's OAuth
 * page. Per the reference it is "for the current logged in user and will have the full scope
 * access", and is meant for development — a production integration should use OAuth.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "Test token (personal)",
  description:
    "The personal test token from your Twist integration's OAuth page. Acts as you, with full " +
    "scope. Use the OAuth method for anything shared.",
  connectionLabel: "Twist ({{name}})",
  fields: [
    {
      key: "apiToken",
      label: "Test token",
      type: "secret",
      required: true,
      hint: "Twist > Integrations > Build > your integration > OAuth > Test token.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken?: string };
    for (const [name, value] of Object.entries(bearer(apiToken))) request.headers[name] = value;
    return request;
  },

  test({ credential }, ctx) {
    return probe((credential as { apiToken?: string })?.apiToken, ctx);
  },

  afterConnect({ credential }, ctx) {
    return whoLabel((credential as { apiToken?: string })?.apiToken, ctx);
  },
};

export default apiToken;
