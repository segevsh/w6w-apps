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
  contactId?: string;
  companyId?: string;
  modifiedSince?: string;
  sortBy?: string;
  order?: string;
}

/** `GET /notes` — notes logged against contacts. Items are `{ note }` wrappers. */
const listNotes: ActionDefinition<Input> = {
  key: "list-notes",
  type: "read",
  resource: "note",
  title: "List Notes",
  description: "List notes, optionally for one contact or company.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string" },
    { key: "companyId", label: "Company ID", type: "string" },
    { key: "modifiedSince", label: "Modified since", type: "string", hint: "e.g. 2026-01-01" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: ["created_at", "modified_at", "updated_at", "date"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    SORT_ORDER_PARAM,
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "items", type: "array", label: "Notes ({note})" },
    { key: "totalCount", type: "number", label: "Total matching" },
    { key: "page", type: "number", label: "Page" },
    { key: "perPage", type: "number", label: "Per page" },
    { key: "maxPage", type: "number", label: "Last page" },
  ],

  async execute(input, ctx) {
    const data = await new OnePageClient(ctx).data("/notes", {
      query: {
        contact_id: input.contactId,
        company_id: input.companyId,
        modified_since: input.modifiedSince,
        sort_by: input.sortBy,
        order: input.order,
        ...pageQuery(input),
      },
    });
    return listResult(data, "notes");
  },
};

export default listNotes;
