import type { AuthDefinition } from "@w6w/types";
import { DEMO_ORIGIN, HEADER_BY_PLAN, PRO_ORIGIN } from "../lib/client.ts";
import { probeKey } from "../lib/probe.ts";

const proApiKey: AuthDefinition = {
  key: "pro-api-key",
  type: "apiKey",
  displayName: "Pro API Key",
  description: "A paid-plan key (Basic, Analyst, Lite, Pro or Enterprise). Sent as the " +
    "`x-cg-pro-api-key` header to pro-api.coingecko.com — actions are written against " +
    "api.coingecko.com and this method rewrites the host when it signs.",
  apiKey: { in: "header", name: HEADER_BY_PLAN.pro },
  fields: [
    {
      key: "apiKey",
      label: "Pro API Key",
      type: "secret",
      required: true,
      hint: "A Demo key belongs to the Demo API Key method instead — pro-api.coingecko.com " +
        "refuses it.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers[HEADER_BY_PLAN.pro] = apiKey;
    if (request.url.startsWith(DEMO_ORIGIN)) {
      request.url = PRO_ORIGIN + request.url.slice(DEMO_ORIGIN.length);
    }
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    return await probeKey("pro", apiKey, ctx);
  },
};

export default proApiKey;
