import type { ActionDefinition } from "@w6w/types";
import { unset, ZendeskClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  cursor?: string;
}

const organizationGetMany: ActionDefinition<Input> = {
  key: "organization-get-many",
  type: "search",
  resource: "organization",
  title: "List Organizations",
  description: "List organizations with cursor pagination.",
  params: pagination,
  output: [
    { key: "organizations", type: "array", label: "Organizations" },
    { key: "meta", type: "object", label: "Cursor meta" },
  ],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request("/organizations.json", {
      query: { "page[size]": input.pageSize, "page[after]": unset(input.cursor) },
    });
  },
};

export default organizationGetMany;
