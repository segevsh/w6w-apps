import type { PageInput } from "../lib/params.ts";
import { listAction } from "../lib/factory.ts";

interface Input extends PageInput {
  email?: string;
  tagId?: number;
  status?: "customers" | "leads" | "clients";
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

const dateParam = (key: string, label: string, hint: string) => ({
  key,
  label,
  type: "string" as const,
  hint,
  validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
});

/** Simplero's DateFilter, `custom` preset: `created_at[preset]=custom&created_at[from]=…`. */
const dateFilter = (from?: string, to?: string) =>
  from || to ? { preset: "custom", from: from || undefined, to: to || undefined } : undefined;

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
    dateParam(
      "createdFrom",
      "Created from (date)",
      "Only contacts created on or after this date (YYYY-MM-DD).",
    ),
    dateParam(
      "createdTo",
      "Created to (date)",
      "Only contacts created on or before this date (YYYY-MM-DD).",
    ),
    dateParam(
      "updatedFrom",
      "Updated from (date)",
      "Only contacts updated on or after this date (YYYY-MM-DD).",
    ),
    dateParam(
      "updatedTo",
      "Updated to (date)",
      "Only contacts updated on or before this date (YYYY-MM-DD).",
    ),
  ],
  query: (i) => ({
    created_at: dateFilter(i.createdFrom, i.createdTo),
    updated_at: dateFilter(i.updatedFrom, i.updatedTo),
    email: i.email ? { op: "equals", value: i.email } : undefined,
    tag_id: i.tagId ? { value: i.tagId, operator: "any" } : undefined,
    status: i.status,
  }),
});
