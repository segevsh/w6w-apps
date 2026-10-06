import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  organizationId: string;
  continuation?: string;
}

const listVenues: ActionDefinition<Input> = {
  key: "list-venues",
  type: "search",
  resource: "venue",
  title: "List Venues",
  description: "List venues belonging to an organization.",
  idempotent: true,
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "venues", type: "array", label: "Venues" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request<EventbriteListResponse<"venues">>(
      `/organizations/${encodeURIComponent(input.organizationId)}/venues/`,
      { query: { continuation: input.continuation } },
    );
  },
};

export default listVenues;
