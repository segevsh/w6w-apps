import type { ActionDefinition } from "@w6w/types";
import {
  listResult,
  OnePageClient,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  SORT_ORDER_PARAM,
  toList,
} from "../lib/client.ts";

interface Input extends PageInput {
  search?: string;
  email?: string;
  phone?: string;
  tag?: string;
  statusId?: string;
  ownerId?: string;
  companyId?: string;
  leadSourceId?: string;
  filterId?: string;
  starred?: boolean;
  team?: boolean;
  modifiedSince?: string;
  fields?: string[] | string;
  sortBy?: string;
  order?: string;
}

/**
 * `GET /contacts` — contacts the user can access, sorted by name. Each `items[]` entry is the
 * vendor's wrapper `{ contact, next_actions, deals, … }`; the related blocks are filled only when
 * `fields` asks for them. `company_id`, `tag` and `filter_id` cannot be combined (vendor rule).
 */
const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List or search contacts, filtered by name/company/phone, email, tag, status, owner or company.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Contact name, company name or phone number.",
    },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      hint: "Use only one of tag, company ID and filter ID.",
    },
    { key: "statusId", label: "Status ID", type: "string" },
    { key: "ownerId", label: "Owner ID", type: "string" },
    { key: "companyId", label: "Company ID", type: "string" },
    { key: "leadSourceId", label: "Lead source ID", type: "string" },
    { key: "filterId", label: "Filter ID", type: "string" },
    { key: "starred", label: "Starred only", type: "boolean" },
    { key: "team", label: "Include other users' contacts", type: "boolean" },
    { key: "modifiedSince", label: "Modified since", type: "string", hint: "e.g. 2026-01-01" },
    {
      key: "fields",
      label: "Related resources",
      type: "string",
      hint: "Comma-separated, e.g. `calls(all),notes(all)`.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: ["created_at", "modified_at", "first_name", "last_name", "company_name", "name"]
        .map((v) => ({ value: v, label: v })),
    },
    SORT_ORDER_PARAM,
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "items", type: "array", label: "Contacts ({contact, …related})" },
    { key: "totalCount", type: "number", label: "Total matching" },
    { key: "page", type: "number", label: "Page" },
    { key: "perPage", type: "number", label: "Per page" },
    { key: "maxPage", type: "number", label: "Last page" },
  ],

  async execute(input, ctx) {
    const data = await new OnePageClient(ctx).data("/contacts", {
      query: {
        search: input.search,
        email: input.email,
        phone: input.phone,
        tag: input.tag,
        status_id: input.statusId,
        owner_id: input.ownerId,
        company_id: input.companyId,
        lead_source_id: input.leadSourceId,
        filter_id: input.filterId,
        starred: input.starred,
        team: input.team,
        modified_since: input.modifiedSince,
        fields: toList(input.fields)?.join(","),
        sort_by: input.sortBy,
        order: input.order,
        ...pageQuery(input),
      },
    });
    return listResult(data, "contacts");
  },
};

export default listContacts;
