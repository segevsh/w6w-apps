import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";
import { resolveEventbriteFields } from "../lib/fields.ts";
import { PAGINATION_CONTINUATION_OUTPUT, T5_SAMPLE, VENUE_OUTPUT } from "../lib/outputs.ts";
import { pageParam, pageQuery } from "../lib/paging.ts";

interface Input {
  organizationId: string;
  page?: number;
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
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      options: { source: "resolveFields" },
      config: { allowCustom: true },
    },
    pageParam(),
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  resolveFields: resolveEventbriteFields,
  output: [
    { key: "venues", type: "array", label: "Venues", items: VENUE_OUTPUT },
    ...PAGINATION_CONTINUATION_OUTPUT,
  ],
  sample: T5_SAMPLE.venues,
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request<EventbriteListResponse<"venues">>(
      `/organizations/${encodeURIComponent(input.organizationId)}/venues/`,
      { query: { page: pageQuery(input.page), continuation: input.continuation } },
    );
  },
};

export default listVenues;
