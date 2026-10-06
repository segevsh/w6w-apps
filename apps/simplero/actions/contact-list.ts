import type { PageInput } from "../lib/params.ts";
import { listAction } from "../lib/factory.ts";

interface Input extends PageInput {
  email?: string;
  tagId?: number;
  status?: "customers" | "leads" | "clients";
}

export default listAction<Input>({
  key: "contact-list",
  resource: "contact",
  title: "List Contacts",
  description:
    "List the account's contacts (Simplero's `customers` resource), optionally filtered by " +
    "exact email, tag or lead/customer status. Without a filter this pages the whole contact " +
    "base, 20 at a time by default.",
  path: "/customers",
  itemsLabel: "Contacts",
  params: [
    {
      key: "email",
      label: "Email (exact match)",
      type: "string",
      hint: "Return only the contact with exactly this email address. Use Search for a " +
        "partial match.",
    },
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Return only contacts carrying this tag.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "customers", label: "Customers" },
        { value: "leads", label: "Leads" },
        { value: "clients", label: "Clients" },
      ],
    },
  ],
  query: (i) => ({
    email: i.email ? { op: "equals", value: i.email } : undefined,
    tag_id: i.tagId ? { value: i.tagId, operator: "any" } : undefined,
    status: i.status,
  }),
});
