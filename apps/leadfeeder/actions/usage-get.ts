import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  startPeriod: string;
  endPeriod: string;
}

/** `GET /v1/usage` — verified against the vendor OpenAPI document (2026-10-06). */
const usageGet: ActionDefinition<Input> = {
  key: "usage-get",
  type: "read",
  resource: "usage",
  title: "Get API Usage",
  description: "Per-endpoint API usage for an account over a month range.",
  params: [
    accountIdParam,
    {
      key: "startPeriod",
      label: "Start month",
      type: "string",
      required: true,
      hint: "`YYYY-MM`.",
    },
    {
      key: "endPeriod",
      label: "End month",
      type: "string",
      required: true,
      hint: "`YYYY-MM`, not before the start.",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/usage";
    const query = {
      account_id: input.accountId,
      start_period: input.startPeriod,
      end_period: input.endPeriod,
    };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default usageGet;
