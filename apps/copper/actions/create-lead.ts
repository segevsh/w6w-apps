import type { ActionDefinition } from "@w6w/types";
import { compact, CopperClient, CUSTOM_FIELDS_PARAM } from "../lib/client.ts";

interface Input {
  name: string;
  email?: Record<string, unknown> | null;
  phoneNumbers?: unknown[] | null;
  address?: Record<string, unknown> | null;
  socials?: unknown[] | null;
  websites?: unknown[] | null;
  companyName?: string;
  title?: string;
  details?: string;
  status?: string;
  monetaryValue?: number;
  customerSourceId?: number;
  assigneeId?: number;
  tags?: string[] | null;
  customFields?: unknown[] | null;
}

/**
 * `POST /leads` — create a Lead.
 *
 * The natural target for an inbound web form: a Lead carries the contact, the
 * company and the deal value in one record, and gets split into a Person,
 * Company and Opportunity when it is qualified and converted.
 *
 * **`email` is a single object, not an array.** Copper's create example sends
 * `"email": {"email": "...", "category": "work"}` — singular — while People take
 * `"emails": [...]`. Phone numbers, socials and websites remain arrays on both.
 * The names are close enough that this is worth stating rather than discovering.
 *
 * `status` is a string from the fixed set "New" / "Unqualified" / "Contacted" /
 * "Qualified" per the Lead properties table. That is a different vocabulary from
 * the account-specific ids returned by `GET /lead_statuses`, which is what the
 * search filter takes.
 *
 * Not idempotent: Leads have no unique key, so a retry creates a duplicate.
 */
const createLead: ActionDefinition<Input> = {
  key: "create-lead",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description:
    "Create a Lead — Copper's pre-qualification catch-all holding contact, company and deal value " +
    "in one record. Note `email` is a single object here, not an array.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "email",
      label: "Email",
      type: "json",
      hint:
        'A single JSON object — `{"email": "lead@example.com", "category": "work"}`. Singular, ' +
        "unlike People, which take an `emails` array.",
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "json",
      hint: 'JSON array, e.g. `[{"number": "415-123-4567", "category": "mobile"}]`.',
    },
    {
      key: "address",
      label: "Address",
      type: "json",
      hint: "JSON object with `street`, `city`, `state`, `postal_code`, `country`.",
    },
    { key: "socials", label: "Socials", type: "json", hint: "JSON array of `{url, category}`." },
    { key: "websites", label: "Websites", type: "json", hint: "JSON array of `{url, category}`." },
    {
      key: "companyName",
      label: "Company name",
      type: "string",
      hint: "Free text — a Lead is not linked to a Company record until it is converted.",
    },
    { key: "title", label: "Job title", type: "string" },
    { key: "details", label: "Details", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "New", label: "New" },
        { value: "Unqualified", label: "Unqualified" },
        { value: "Contacted", label: "Contacted" },
        { value: "Qualified", label: "Qualified" },
      ],
      hint:
        "Copper's documented Lead status strings. The search filter instead takes account-specific " +
        "numeric ids from `GET /lead_statuses`.",
    },
    {
      key: "monetaryValue",
      label: "Monetary value",
      type: "number",
      hint: "Expected value of business with this Lead.",
    },
    {
      key: "customerSourceId",
      label: "Customer source ID",
      type: "number",
      hint: "Read the ids from `GET /customer_sources`.",
    },
    { key: "assigneeId", label: "Assignee (User) ID", type: "number" },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array of strings." },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "number", label: "Lead ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new CopperClient(ctx).request("/leads", {
      method: "POST",
      body: compact({
        name: input.name,
        email: input.email ?? undefined,
        phone_numbers: input.phoneNumbers ?? undefined,
        address: input.address ?? undefined,
        socials: input.socials ?? undefined,
        websites: input.websites ?? undefined,
        company_name: input.companyName,
        title: input.title,
        details: input.details,
        status: input.status,
        monetary_value: input.monetaryValue,
        customer_source_id: input.customerSourceId,
        assignee_id: input.assigneeId,
        tags: input.tags ?? undefined,
        custom_fields: input.customFields ?? undefined,
      }),
    });
  },
};

export default createLead;
