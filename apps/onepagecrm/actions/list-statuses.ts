import type { ActionDefinition } from "@w6w/types";
import { OnePageClient } from "../lib/client.ts";

/** `GET /statuses` — The account's contact statuses (lead, prospect, customer, custom) in configured order; use the status id on contacts. */
const listStatuses: ActionDefinition<Record<string, never>> = {
  key: "list-statuses",
  type: "read",
  resource: "status",
  title: "List Statuses",
  description:
    "The account's contact statuses (lead, prospect, customer, custom) in configured order; use the status id on contacts.",
  params: [],
  output: [{ key: "statuses", type: "array", label: "Statuses ({status})" }],

  async execute(_input, ctx) {
    const data = await new OnePageClient(ctx).data("/statuses");
    return { statuses: Array.isArray(data) ? data : [] };
  },
};

export default listStatuses;
