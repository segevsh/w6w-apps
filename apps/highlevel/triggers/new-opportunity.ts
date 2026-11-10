import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listOpportunities from "../actions/list-opportunities.ts";

/**
 * Newest-first poll over `list-opportunities` (`GET /opportunities/search`). The endpoint takes
 * `order` with `added_desc` / `added_asc` / `name_asc` / `name_desc` and `limit` up to 100
 * (https://marketplace.gohighlevel.com/docs/ghl/opportunities/search-opportunity, verified
 * 2026-11-10), so `order=added_desc&limit=100&page=1` is the newest 100 opportunities. It needs no
 * Marketplace webhook setup, unlike `opportunity-created`.
 */
export default pollFromListAction<{ pipelineId?: string }>({
  key: "new-opportunity",
  title: "New Opportunity (polling)",
  description:
    "Checks the connected HighLevel location for opportunities added since the last check, optionally within one pipeline. The run gets each new opportunity (name, pipeline, stage, status, monetary value, contact). Needs no webhook setup; for instant delivery use New Opportunity.",
  action: listOpportunities,
  params: [
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "string",
      hint: "Only opportunities in this pipeline. Leave empty for every pipeline.",
    },
  ],
  input: (params) => ({
    order: "added_desc",
    limit: 100,
    page: 1,
    ...(params.pipelineId ? { pipelineId: params.pipelineId } : {}),
  }),
  items: (r) => (r as { opportunities?: unknown[] }).opportunities ?? [],
  idOf: (o) => String((o as { id: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Opportunity ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "pipelineId", type: "string", label: "Pipeline ID" },
    { key: "pipelineStageId", type: "string", label: "Pipeline stage ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "monetaryValue", type: "number", label: "Monetary value" },
    { key: "assignedTo", type: "string", label: "Assigned user ID" },
    { key: "contact", type: "object", label: "Contact" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "sample-opportunity-id",
    name: "Sample deal",
    pipelineId: "sample-pipeline-id",
    pipelineStageId: "sample-stage-id",
    status: "open",
    monetaryValue: 500,
    assignedTo: "sample-user-id",
    contact: { id: "sample-contact-id", name: "John Deo" },
    createdAt: "2026-11-10T12:41:02.193Z",
    updatedAt: "2026-11-10T12:41:02.193Z",
  },
});
