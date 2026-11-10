import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  email?: string;
  search?: string;
  listId?: string;
  tagId?: string;
  status?: string;
  orderBy?: string;
  orderDirection?: string;
}

const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, optionally filtered by email, list, tag or status.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 20, hint: "Max 100 per page." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "cdate", label: "Created" },
        { value: "udate", label: "Last updated" },
      ],
      hint: "Optional. Leave empty to keep ActiveCampaign's default order.",
    },
    {
      key: "orderDirection",
      label: "Order direction",
      type: "select",
      options: [
        { value: "ASC", label: "Oldest first" },
        { value: "DESC", label: "Newest first" },
      ],
      default: "DESC",
      hint: "Used with Order by.",
    },
    { key: "email", label: "Email (exact match)", type: "string" },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches name, organization, phone or email.",
    },
    { key: "listId", label: "List ID", type: "string" },
    { key: "tagId", label: "Tag ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "0", label: "Unconfirmed" },
        { value: "1", label: "Active" },
        { value: "2", label: "Unsubscribed" },
        { value: "3", label: "Bounced" },
        { value: "-1", label: "Any" },
      ],
    },
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request("/contacts", {
      query: {
        limit: input.limit,
        offset: input.offset,
        email: input.email,
        search: input.search,
        listid: input.listId,
        tagid: input.tagId,
        status: input.status,
        ...(input.orderBy
          ? { [`orders[${input.orderBy}]`]: input.orderDirection === "ASC" ? "ASC" : "DESC" }
          : {}),
      },
    });
  },
};

export default listContacts;
