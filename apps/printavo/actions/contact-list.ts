import type { ActionDefinition } from "@w6w/types";
import { DEFAULT_PAGE_SIZE, PrintavoClient, toPage } from "../lib/client.ts";
import { CONTACT_FIELDS, PAGE_INFO } from "../lib/fields.ts";

interface Input {
  first?: number;
  after?: string;
  query?: string;
  primaryOnly?: boolean;
  sortOn?: string;
  sortDescending?: boolean;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts with optional search and sorting.",
  params: [
    {
      key: "first",
      label: "Page Size",
      type: "number",
      hint: "Items per page (default 25).",
      default: 25,
    },
    {
      key: "after",
      label: "After Cursor",
      type: "string",
      hint: "endCursor from a previous call.",
    },
    { key: "query", label: "Search", type: "string", hint: "Free-text search." },
    { key: "primaryOnly", label: "Primary Contacts Only", type: "boolean" },
    {
      key: "sortOn",
      label: "Sort On",
      type: "select",
      options: [
        { label: "Contact email", value: "CONTACT_EMAIL" },
        { label: "Contact name", value: "CONTACT_NAME" },
        { label: "Customer name", value: "CUSTOMER_NAME" },
        { label: "Order count", value: "ORDER_COUNT" },
      ],
    },
    { key: "sortDescending", label: "Sort Descending", type: "boolean" },
  ],
  output: [
    { key: "nodes", type: "array", label: "Contacts" },
    { key: "totalNodes", type: "number", label: "Total Matching" },
    { key: "hasNextPage", type: "boolean", label: "More Pages" },
    { key: "endCursor", type: "string", label: "Next Cursor" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ contacts: Parameters<typeof toPage>[0] }>(
      `query($first: Int, $after: String, $query: String, $primaryOnly: Boolean, $sortOn: ContactSortField, $sortDescending: Boolean) { contacts(first: $first, after: $after, query: $query, primaryOnly: $primaryOnly, sortOn: $sortOn, sortDescending: $sortDescending) { totalNodes ${PAGE_INFO} nodes { ${CONTACT_FIELDS} } } }`,
      {
        first: input.first ?? DEFAULT_PAGE_SIZE,
        after: input.after,
        query: input.query,
        primaryOnly: input.primaryOnly,
        sortOn: input.sortOn,
        sortDescending: input.sortDescending,
      },
    );
    return toPage(data.contacts);
  },
};

export default contactList;
