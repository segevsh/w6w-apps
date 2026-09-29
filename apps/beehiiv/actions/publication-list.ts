import type { ActionDefinition } from "@w6w/types";
import { BeehiivClient, compact } from "../lib/client.ts";
import { directionParam, expandParam, offsetPaginationParams } from "../lib/params.ts";

interface Input {
  expand?: string;
  limit?: number;
  page?: number;
  direction?: "asc" | "desc";
  orderBy?: "created" | "name";
}

/** `GET /publications` — every publication the API key's workspace owns. */
const publicationList: ActionDefinition<Input> = {
  key: "publication-list",
  type: "read",
  resource: "publication",
  title: "List Publications",
  description: "Retrieve all publications associated with your API key.",
  params: [
    expandParam("Comma-separated: `subscriptions` (subscriber counts), `stats` (engagement)."),
    ...offsetPaginationParams(),
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "created", label: "Created (default)" },
        { value: "name", label: "Name" },
      ],
    },
    directionParam,
  ],
  output: [
    { key: "id", type: "string", label: "Publication ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "organization_name", type: "string", label: "Organization name" },
    { key: "created", type: "number", label: "Created (Unix seconds)" },
    { key: "stats", type: "object", label: "Stats — only present when expanded" },
  ],

  async execute(input, ctx) {
    const page = await new BeehiivClient(ctx).list("/publications", {
      query: compact({
        expand: input.expand,
        limit: input.limit,
        page: input.page,
        order_by: input.orderBy,
        direction: input.direction,
      }),
    });
    return page;
  },
};

export default publicationList;
