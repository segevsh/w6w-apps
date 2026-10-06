import type { ActionDefinition } from "@w6w/types";
import { LushaClient } from "../lib/client.ts";

type Input = Record<string, never>;

const action: ActionDefinition<Input> = {
  key: "contact-filter-list",
  type: "read",
  resource: "contact",
  title: "List Contact Filter Types",
  description:
    "The filter types Prospect Contacts accepts, and whether each needs a search query to list its values.",
  params: [],
  output: [
    { key: "availableFilters", type: "array", label: "Filter types" },
  ],

  execute(_input, ctx) {
    return new LushaClient(ctx).request("GET", `/v3/contacts/prospecting/filters`, {});
  },
};

export default action;
