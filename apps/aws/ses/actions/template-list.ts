import type { ActionDefinition } from "@w6w/types";
import { camelKeys, qs, ses } from "../lib/api.ts";

/**
 * ListEmailTemplates — `GET /v2/email/templates?NextToken=&PageSize=`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_ListEmailTemplates.html
 */
interface Input {
  pageSize?: number;
  nextToken?: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "template-list",
  type: "search",
  resource: "template",
  title: "List Templates",
  description: "List the email templates stored in this region.",
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
    { key: "templates", type: "array", label: "templateName, createdTimestamp" },
    { key: "nextToken", type: "string", label: "Token for the next page, absent on the last page" },
  ],

  async execute(input, ctx) {
    const res = await ses<{ TemplatesMetadata?: unknown[]; NextToken?: string }>(ctx, {
      op: "ListEmailTemplates",
      path: "/v2/email/templates",
      query: qs({ PageSize: input.pageSize, NextToken: input.nextToken }),
    });
    return { templates: camelKeys(res.TemplatesMetadata ?? []), nextToken: res.NextToken };
  },
};

export default action;
