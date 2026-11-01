import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";
import {
  ORGANIZATION_OUTPUT,
  ORGANIZATION_SAMPLE,
  PAGINATION_CONTINUATION_OUTPUT,
  PAGINATION_CONTINUATION_SAMPLE,
} from "../lib/outputs.ts";

interface Input {
  userId?: string;
  page?: number;
}

const listOrganizations: ActionDefinition<Input> = {
  key: "list-organizations",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description: "List the organizations a user belongs to (the connected user by default).",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      hint: "Defaults to the connected user (`me`).",
    },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "organizations", type: "array", label: "Organizations", items: ORGANIZATION_OUTPUT },
    ...PAGINATION_CONTINUATION_OUTPUT,
  ],
  sample: {
    organizations: [ORGANIZATION_SAMPLE],
    pagination: PAGINATION_CONTINUATION_SAMPLE,
  },

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request<EventbriteListResponse<"organizations">>(
      `/users/${input.userId ? encodeURIComponent(input.userId) : "me"}/organizations/`,
      { query: { page: input.page } },
    );
  },
};

export default listOrganizations;
