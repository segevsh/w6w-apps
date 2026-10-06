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
  done?: boolean;
  status?: string;
  assigneeId?: string;
  contactId?: string;
  companyId?: string;
  modifiedSince?: string;
  sortBy?: string;
  order?: string;
}

/** `GET /actions` — next actions in Action Stream order. Items are `{ action }` wrappers. */
const listActions: ActionDefinition<Input> = {
  key: "list-actions",
  type: "read",
  resource: "action",
  title: "List Next Actions",
  description: "List next actions, filtered by assignee, contact, company, done flag or status.",
  params: [
    { key: "done", label: "Done", type: "boolean", hint: "true = completed actions only." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["asap", "date", "date_time", "waiting", "queued", "queued_with_date", "done"]
        .map((v) => ({ value: v, label: v })),
    },
    { key: "assigneeId", label: "Assignee ID", type: "string" },
    { key: "contactId", label: "Contact ID", type: "string" },
    { key: "companyId", label: "Company ID", type: "string" },
    { key: "modifiedSince", label: "Modified since", type: "string", hint: "e.g. 2026-01-01" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: ["created_at", "modified_at"].map((v) => ({ value: v, label: v })),
    },
    SORT_ORDER_PARAM,
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "items", type: "array", label: "Actions ({action})" },
    { key: "totalCount", type: "number", label: "Total matching" },
    { key: "page", type: "number", label: "Page" },
    { key: "perPage", type: "number", label: "Per page" },
    { key: "maxPage", type: "number", label: "Last page" },
  ],

  async execute(input, ctx) {
    const data = await new OnePageClient(ctx).data("/actions", {
      query: {
        done: input.done,
        status: input.status,
        assignee_id: input.assigneeId,
        contact_id: input.contactId,
        company_id: input.companyId,
        modified_since: input.modifiedSince,
        sort_by: input.sortBy,
        order: input.order,
        ...pageQuery(input),
      },
    });
    return listResult(data, "actions");
  },
};

export default listActions;
