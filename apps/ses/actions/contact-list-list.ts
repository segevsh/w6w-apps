import type { ActionDefinition } from "@w6w/types";
import { camelKeys, qs, ses } from "../lib/api.ts";

/**
 * ListContactLists — `GET /v2/email/contact-lists?NextToken=&PageSize=`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_ListContactLists.html
 */
interface Input {
  pageSize?: number;
  nextToken?: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "contact-list-list",
  type: "search",
  resource: "contact-list",
  title: "List Contact Lists",
  description: "List the contact lists in this region.",
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
    { key: "contactLists", type: "array", label: "contactListName, lastUpdatedTimestamp" },
    { key: "nextToken", type: "string", label: "Token for the next page, absent on the last page" },
  ],

  async execute(input, ctx) {
    const res = await ses<{ ContactLists?: unknown[]; NextToken?: string }>(ctx, {
      op: "ListContactLists",
      path: "/v2/email/contact-lists",
      query: qs({ PageSize: input.pageSize, NextToken: input.nextToken }),
    });
    return { contactLists: camelKeys(res.ContactLists ?? []), nextToken: res.NextToken };
  },
};

export default action;
