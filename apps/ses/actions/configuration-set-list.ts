import type { ActionDefinition } from "@w6w/types";
import { qs, ses } from "../lib/api.ts";

/**
 * ListConfigurationSets — `GET /v2/email/configuration-sets?NextToken=&PageSize=`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_ListConfigurationSets.html
 */
interface Input {
  pageSize?: number;
  nextToken?: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "configuration-set-list",
  type: "search",
  resource: "configuration-set",
  title: "List Configuration Sets",
  description: "List the configuration set names in this region, for use in the send actions.",
  params: [
    { key: "pageSize", label: "Page size", type: "number", hint: "Max items per page (1-1000)." },
    {
      key: "nextToken",
      label: "Next token",
      type: "string",
      hint: "Token from a previous call to fetch the next page.",
    },
  ],
  output: [
    { key: "configurationSets", type: "array", label: "Configuration set names" },
    { key: "nextToken", type: "string", label: "Token for the next page, absent on the last page" },
  ],

  async execute(input, ctx) {
    const res = await ses<{ ConfigurationSets?: string[]; NextToken?: string }>(ctx, {
      op: "ListConfigurationSets",
      path: "/v2/email/configuration-sets",
      query: qs({ PageSize: input.pageSize, NextToken: input.nextToken }),
    });
    return { configurationSets: res.ConfigurationSets ?? [], nextToken: res.NextToken };
  },
};

export default action;
