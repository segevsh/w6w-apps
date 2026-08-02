import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient } from "../lib/client.ts";

interface Input {
  pipelineId?: string;
  pipelineStageId?: string;
  contactId?: string;
  status?: "open" | "won" | "lost" | "abandoned" | "all";
  assignedTo?: string;
  query?: string;
  limit?: number;
  page?: number;
}

const listOpportunities: ActionDefinition<Input> = {
  key: "list-opportunities",
  type: "read",
  resource: "opportunity",
  title: "List / Search Opportunities",
  description:
    "Search opportunities in the connected location, optionally filtered by pipeline, stage, contact, status or owner.",
  params: [
    { key: "pipelineId", label: "Pipeline ID", type: "string" },
    { key: "pipelineStageId", label: "Pipeline stage ID", type: "string" },
    { key: "contactId", label: "Contact ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "won", label: "Won" },
        { value: "lost", label: "Lost" },
        { value: "abandoned", label: "Abandoned" },
        { value: "all", label: "All" },
      ],
    },
    { key: "assignedTo", label: "Assigned user ID", type: "string" },
    { key: "query", label: "Search", type: "string", hint: "Matches contact email/name." },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "limit", label: "Limit", type: "number", default: 20 },
  ],
  output: [
    { key: "opportunities", type: "array", label: "Opportunities" },
    { key: "meta", type: "object", label: "Paging metadata" },
  ],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/opportunities/search", {
      query: {
        // HighLevel spells this one `location_id` (snake_case), unlike every
        // other v2 endpoint's `locationId` — verified against the published
        // OpenAPI spec, not a typo.
        location_id: client.locationId,
        pipeline_id: input.pipelineId,
        pipeline_stage_id: input.pipelineStageId,
        contact_id: input.contactId,
        status: input.status,
        assigned_to: input.assignedTo,
        q: input.query,
        page: input.page ?? 1,
        limit: input.limit ?? 20,
      },
    });
  },
};

export default listOpportunities;
