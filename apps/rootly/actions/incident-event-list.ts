import type { ActionDefinition } from "@w6w/types";
import { listResult, RootlyClient, seg } from "../lib/client.ts";

interface Input {
  incident_id: string;
  page_number?: number;
  page_size?: number;
}

/** `GET /v1/incidents/{incident_id}/events` */
const incidentEventList: ActionDefinition<Input> = {
  key: "incident-event-list",
  type: "read",
  resource: "incident-event",
  title: "List Incident Events",
  description: "List an incident's timeline events (notes, status changes, updates).",
  params: [
    {
      key: "incident_id",
      label: "Incident ID",
      type: "string",
      required: true,
    },
    {
      key: "page_number",
      label: "Page number",
      type: "number",
      hint: "1-based page index.",
    },
    {
      key: "page_size",
      label: "Page size",
      type: "number",
      hint: "Items per page.",
    },
  ],
  output: [
    {
      key: "items",
      type: "array",
      label: "Records, each flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
    {
      key: "meta",
      type: "object",
      label: "Paging: current_page, next_page, next_cursor, total_count, total_pages",
    },
    { key: "links", type: "object", label: "Paging links: self, first, prev, next, last" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request(
      "GET",
      `/v1/incidents/${seg(input.incident_id)}/events`,
      {
        query: {
          "page[number]": input.page_number,
          "page[size]": input.page_size,
        },
      },
    );
    return listResult(res);
  },
};

export default incidentEventList;
