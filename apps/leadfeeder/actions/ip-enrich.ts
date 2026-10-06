import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  ip: string;
}

/** `GET /v1/ip/enrich` — verified against the vendor OpenAPI document (2026-10-06). */
const ipEnrich: ActionDefinition<Input> = {
  key: "ip-enrich",
  type: "read",
  resource: "ip",
  title: "Enrich IP Address",
  description: "Resolve an IP address to the company (or network) behind it.",
  params: [
    accountIdParam,
    {
      key: "ip",
      label: "IP address",
      type: "string",
      required: true,
      hint: "IPv4 or IPv6 address.",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/ip/enrich";
    const query = { ip: input.ip, account_id: input.accountId };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default ipEnrich;
