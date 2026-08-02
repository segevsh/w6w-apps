import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  mailboxId?: number;
  firstName?: string;
  lastName?: string;
  modifiedSince?: string;
  sortField?: string;
  sortOrder?: string;
  page?: number;
}

const listCustomers: ActionDefinition<Input> = {
  key: "list-customers",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "List and filter customers. Defaults to newest first.",
  params: [
    { key: "mailboxId", label: "Inbox ID", type: "number", row: "filter" },
    { key: "firstName", label: "First name", type: "string", row: "filter" },
    { key: "lastName", label: "Last name", type: "string", row: "filter" },
    {
      key: "modifiedSince",
      label: "Modified since",
      type: "datetime",
      advanced: true,
      hint: "Only customers modified on or after this time.",
    },
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      default: "createdAt",
      row: "sort",
      advanced: true,
      options: [
        { value: "createdAt", label: "Created" },
        { value: "firstName", label: "First name" },
        { value: "lastName", label: "Last name" },
        { value: "modifiedAt", label: "Modified" },
      ],
    },
    {
      key: "sortOrder",
      label: "Order",
      type: "select",
      default: "desc",
      row: "sort",
      advanced: true,
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "customers", type: "array", label: "Customers" }],

  async execute(input, ctx) {
    const body = await new HelpScoutClient(ctx).request<{ _embedded?: { customers?: unknown } }>(
      "/customers",
      {
        query: {
          mailbox: input.mailboxId,
          firstName: unset(input.firstName),
          lastName: unset(input.lastName),
          modifiedSince: unset(input.modifiedSince),
          sortField: unset(input.sortField),
          sortOrder: unset(input.sortOrder),
          page: input.page,
        },
      },
    );
    return { customers: body._embedded?.customers ?? [] };
  },
};

export default listCustomers;
