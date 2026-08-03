import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient, unset } from "../lib/client.ts";
import { orderTypeParam, pagination, workspaceId } from "../lib/params.ts";

interface Input {
  query?: string;
  view?: string;
  updatedSince?: string;
  orderBy?: string;
  orderType?: string;
  workspaceId?: number;
  page?: number;
  perPage?: number;
}

const changeGetMany: ActionDefinition<Input> = {
  key: "change-get-many",
  type: "search",
  resource: "change",
  title: "List Changes",
  description: "List change requests, with the Changes module's own query and view filters.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      hint:
        "Freshservice filter syntax, e.g. `priority:4 OR priority:3`. Cannot be combined with View.",
      placeholder: "priority:4 OR priority:3",
    },
    {
      key: "view",
      label: "View",
      type: "string",
      hint: "Name or ID of a view in the Change management module. Cannot be combined with Query.",
    },
    { key: "updatedSince", label: "Updated since", type: "datetime" },
    {
      key: "orderBy",
      label: "Sort by",
      type: "string",
      row: "sort",
      advanced: true,
      hint: "A change field name, e.g. `priority`.",
    },
    { ...orderTypeParam, advanced: true },
    workspaceId,
    ...pagination,
  ],
  output: [{ key: "changes", type: "array", label: "Changes" }],

  async execute(input, ctx) {
    if (input.query && input.view) {
      // The API rejects the combination; catching it here gives a better
      // message than a 400 with Freshservice's prose in it.
      throw new Error("Freshservice accepts `query` or `view`, not both.");
    }
    const changes = await new FreshserviceClient(ctx).resource<unknown[]>("changes", "/changes", {
      query: {
        query: unset(input.query),
        view: unset(input.view),
        updated_since: unset(input.updatedSince),
        order_by: unset(input.orderBy),
        order_type: unset(input.orderType),
        workspace_id: input.workspaceId,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { changes };
  },
};

export default changeGetMany;
