import type { ActionDefinition } from "@w6w/types";
import {
  listResult,
  OnePageClient,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  SORT_ORDER_PARAM,
} from "../lib/client.ts";

interface Input extends PageInput {
  search?: string;
  name?: string;
  status?: string;
  stage?: number;
  pipelineId?: string;
  ownerId?: string;
  contactId?: string;
  companyId?: string;
  modifiedSince?: string;
  sortBy?: string;
  order?: string;
}

/** `GET /deals` — the account's deals. Items are `{ deal, contacts }` wrappers. */
const listDeals: ActionDefinition<Input> = {
  key: "list-deals",
  type: "read",
  resource: "deal",
  title: "List Deals",
  description: "List deals, filtered by status, stage, pipeline, owner, contact or company.",
  params: [
    { key: "search", label: "Search", type: "string" },
    { key: "name", label: "Name", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "won", label: "Won" },
        { value: "lost", label: "Lost" },
      ],
    },
    { key: "stage", label: "Stage", type: "number", validation: { integer: true } },
    { key: "pipelineId", label: "Pipeline ID", type: "string" },
    { key: "ownerId", label: "Owner ID", type: "string" },
    { key: "contactId", label: "Contact ID", type: "string" },
    { key: "companyId", label: "Company ID", type: "string" },
    { key: "modifiedSince", label: "Modified since", type: "string", hint: "e.g. 2026-01-01" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: ["created_at", "modified_at", "date", "close_date", "expected_close_date"]
        .map((v) => ({ value: v, label: v })),
    },
    SORT_ORDER_PARAM,
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "items", type: "array", label: "Deals ({deal, contacts})" },
    { key: "totalCount", type: "number", label: "Total matching" },
    { key: "page", type: "number", label: "Page" },
    { key: "perPage", type: "number", label: "Per page" },
    { key: "maxPage", type: "number", label: "Last page" },
  ],

  async execute(input, ctx) {
    const data = await new OnePageClient(ctx).data("/deals", {
      query: {
        search: input.search,
        name: input.name,
        status: input.status,
        stage: input.stage,
        pipeline_id: input.pipelineId,
        owner_id: input.ownerId,
        contact_id: input.contactId,
        company_id: input.companyId,
        modified_since: input.modifiedSince,
        sort_by: input.sortBy,
        order: input.order,
        ...pageQuery(input),
      },
    });
    return listResult(data, "deals");
  },
};

export default listDeals;
