import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";
import { includeArchivedParam } from "../lib/params.ts";

interface Input {
  includeArchived?: boolean;
}

/** `GET /v1/company/named-lists` — every company list (sites, departments, ...) with its items. */
const namedListsList: ActionDefinition<Input> = {
  key: "named-lists-list",
  type: "read",
  resource: "metadata",
  title: "List Company Lists",
  description: "List all company lists (sites, departments, job titles, ...) with their items.",
  params: [includeArchivedParam],
  output: [{ key: "lists", type: "array", label: "Lists, each with name and items" }],

  async execute(input, ctx) {
    const lists = await new HibobClient(ctx).get<unknown[]>("/company/named-lists", {
      includeArchived: input.includeArchived ? true : undefined,
    });
    return { lists, count: Array.isArray(lists) ? lists.length : 0 };
  },
};

export default namedListsList;
