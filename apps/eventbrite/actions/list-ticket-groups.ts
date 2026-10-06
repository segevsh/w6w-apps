import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  status?: "live" | "archived" | "deleted" | "all";
  expand?: string;
  continuation?: string;
}

const action: ActionDefinition<Input> = {
  key: "list-ticket-groups",
  type: "search",
  resource: "ticket_group",
  title: "List Ticket Groups",
  description: "List an organization's ticket groups. Paginated.",
  idempotent: true,
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "live", label: "live" }, { value: "archived", label: "archived" }, {
        value: "deleted",
        label: "deleted",
      }, { value: "all", label: "all" }],
    },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      hint: "e.g. `tickets` to include ticket class name and sales channel.",
    },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "ticket_groups", type: "array", label: "Ticket groups" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    return await client.request(`/organizations/${enc(input.organizationId)}/ticket_groups/`, {
      method: "GET",
      query: {
        status: input.status,
        expand: input.expand,
        continuation: input.continuation,
      },
    });
  },
};

export default action;
