import type { ActionDefinition } from "@w6w/types";
import {
  KitClient,
  type KitList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  emailAddress?: string;
  status?: "active" | "inactive" | "bounced" | "complained" | "cancelled" | "all";
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  sortField?: "id" | "updated_at" | "cancelled_at";
  sortOrder?: "asc" | "desc";
  include?: string;
  slim?: boolean;
}

const listSubscribers: ActionDefinition<Input> = {
  key: "list-subscribers",
  type: "search",
  resource: "subscriber",
  title: "List Subscribers",
  description:
    "List subscribers, one cursor page at a time. Defaults to `active` only — widen with `status`, or look a single subscriber up by exact `emailAddress`.",
  params: [
    {
      key: "emailAddress",
      label: "Email address",
      type: "string",
      hint: "Exact match. The documented way to look a subscriber up by email rather than id.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "bounced", label: "Bounced" },
        { value: "complained", label: "Complained" },
        { value: "cancelled", label: "Cancelled" },
        { value: "all", label: "All" },
      ],
      hint: "Kit defaults to `active` when omitted.",
    },
    { key: "createdAfter", label: "Created after", type: "date", hint: "Format `yyyy-mm-dd`." },
    { key: "createdBefore", label: "Created before", type: "date", hint: "Format `yyyy-mm-dd`." },
    { key: "updatedAfter", label: "Updated after", type: "date", hint: "Format `yyyy-mm-dd`." },
    { key: "updatedBefore", label: "Updated before", type: "date", hint: "Format `yyyy-mm-dd`." },
    {
      key: "sortField",
      label: "Sort field",
      type: "select",
      options: [
        { value: "id", label: "Id" },
        { value: "updated_at", label: "Updated at" },
        { value: "cancelled_at", label: "Cancelled at" },
      ],
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Comma-separated extra fields: `attribution`, `tags`, `location`, `canceled_at`.",
    },
    {
      key: "slim",
      label: "Slim response",
      type: "boolean",
      hint: "Omit expensive optional fields for a faster, smaller response.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "subscribers", type: "array", label: "Subscribers" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new KitClient(ctx).request<KitList<"subscribers">>("/subscribers", {
      query: {
        ...pageQuery(input),
        email_address: input.emailAddress,
        status: input.status,
        created_after: input.createdAfter,
        created_before: input.createdBefore,
        updated_after: input.updatedAfter,
        updated_before: input.updatedBefore,
        sort_field: input.sortField,
        sort_order: input.sortOrder,
        include: input.include,
        slim: input.slim,
      },
    });
  },
};

export default listSubscribers;
