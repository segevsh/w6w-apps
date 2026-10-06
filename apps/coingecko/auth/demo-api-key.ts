import type { AuthDefinition } from "@w6w/types";
import { HEADER_BY_PLAN } from "../lib/client.ts";
import { probeKey } from "../lib/probe.ts";

const demoApiKey: AuthDefinition = {
  key: "demo-api-key",
  type: "apiKey",
  displayName: "Demo API Key",
  description: "A free Demo key from the CoinGecko developer dashboard. Sent as the " +
    "`x-cg-demo-api-key` header to api.coingecko.com.",
  apiKey: { in: "header", name: HEADER_BY_PLAN.demo },
  fields: [
    {
      key: "apiKey",
      label: "Demo API Key",
      type: "secret",
      required: true,
      hint: "Starts with CG-. A Pro-family key (Basic and above) belongs to the Pro API Key " +
        "method instead — CoinGecko refuses it on the demo host.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers[HEADER_BY_PLAN.demo] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    return await probeKey("demo", apiKey, ctx);
  },
};

export default demoApiKey;
