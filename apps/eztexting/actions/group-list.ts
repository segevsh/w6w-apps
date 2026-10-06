import type { ActionDefinition } from "@w6w/types";
import { compact, EzTextingClient } from "../lib/client.ts";
import { pageOutput, paginationParams, sortParam } from "../lib/params.ts";

/** `GET /v1/contact-groups` — list contact groups, optionally filtered by name (`like`). */
interface Input {
  name?: string;
  page?: number;
  size?: string;
  sort?: string;
}

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List Contact Groups",
  description: "List contact groups, optionally filtered by name.",
  params: [
    { key: "name", label: "Name contains", type: "string" },
    ...paginationParams(),
    sortParam(),
  ],
  output: pageOutput("Contact groups"),

  execute(input, ctx) {
    return new EzTextingClient(ctx).page("/contact-groups", {
      query: compact({
        page: input.page,
        size: input.size,
        sort: input.sort,
        "filters[name][like]": input.name,
      }) as Record<string, string>,
    });
  },
};

export default groupList;
