import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  organizationId: string;
}

const listWebhooks: ActionDefinition<Input> = {
  key: "list-webhooks",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the webhooks configured for an organization.",
  idempotent: true,
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
  ],
  output: [
    { key: "webhooks", type: "array", label: "Webhooks" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request<EventbriteListResponse<"webhooks">>(
      `/organizations/${encodeURIComponent(input.organizationId)}/webhooks/`,
    );
  },
};

export default listWebhooks;
