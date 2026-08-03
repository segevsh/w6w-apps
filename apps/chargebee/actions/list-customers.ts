import type { ActionDefinition } from "@w6w/types";
import {
  ChargebeeClient,
  type ChargebeeList,
  filterIs,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  SORT_ORDER_PARAM,
  sortBy,
} from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  autoCollection?: string;
  includeDeleted?: boolean;
  sortAttribute?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * `GET /customers` — offset-cursor list of customers.
 *
 * The filters exposed here are the documented ones, mapped through their
 * OPERATOR form: Chargebee's list filters are `deepObject` parameters, so a name
 * search is `first_name[is]=John`, never `first_name=John`. Each of `email`,
 * `first_name`, `last_name` and `company` documents `is`, `is_not`,
 * `starts_with` and `is_present`; this action exposes exact-match (`is`), which
 * is the one a workflow reaches for. `auto_collection` documents `is`, `is_not`,
 * `in` and `not_in` over the enum `on` / `off`.
 *
 * `sort_by` accepts `created_at` or `updated_at` here — the two attributes the
 * customers list documents, and no others.
 */
const listCustomers: ActionDefinition<Input> = {
  key: "list-customers",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "List customers one page at a time, optionally filtered by email, name, company or " +
    "auto-collection setting.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Exact match (`email[is]`).",
    },
    { key: "firstName", label: "First name", type: "string", hint: "Exact match." },
    { key: "lastName", label: "Last name", type: "string", hint: "Exact match." },
    { key: "company", label: "Company", type: "string", hint: "Exact match." },
    {
      key: "autoCollection",
      label: "Auto collection",
      type: "select",
      options: [
        { value: "on", label: "On — charge automatically" },
        { value: "off", label: "Off — invoice and collect manually" },
      ],
    },
    {
      key: "includeDeleted",
      label: "Include deleted",
      type: "boolean",
      hint: "Deleted customers come back with `deleted: true`.",
    },
    {
      key: "sortAttribute",
      label: "Sort by",
      type: "select",
      options: [
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    SORT_ORDER_PARAM,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request<ChargebeeList>("/customers", {
      query: {
        limit: input.limit,
        offset: input.offset,
        include_deleted: input.includeDeleted,
        email: filterIs(input.email),
        first_name: filterIs(input.firstName),
        last_name: filterIs(input.lastName),
        company: filterIs(input.company),
        auto_collection: filterIs(input.autoCollection),
        sort_by: sortBy(input.sortAttribute, input.sortOrder),
      },
    });
  },
};

export default listCustomers;
