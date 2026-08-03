import type { ActionDefinition } from "@w6w/types";
import { compact, CopperClient, CUSTOM_FIELDS_PARAM } from "../lib/client.ts";

interface Input {
  name: string;
  emailDomain?: string;
  address?: Record<string, unknown> | null;
  phoneNumbers?: unknown[] | null;
  socials?: unknown[] | null;
  websites?: unknown[] | null;
  details?: string;
  primaryContactId?: number;
  contactTypeId?: number;
  assigneeId?: number;
  tags?: string[] | null;
  customFields?: unknown[] | null;
}

/**
 * `POST /companies` — create a Company.
 *
 * `name` is the only required field. Note that in Copper's vocabulary a
 * "Company" is a customer organization, not your own account — your own
 * organization is the Account (`GET /account`).
 *
 * **Not idempotent, and it will fail rather than duplicate.** Email domain is a
 * unique key: "no two records can have the same domain name. If you try to
 * create a new Company with an existing email domain, then your request will
 * fail." A retry after success errors instead of making a second record.
 */
const createCompany: ActionDefinition<Input> = {
  key: "create-company",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description:
    "Create a Company (a customer organization). Email domains are unique across Companies — " +
    "reusing one fails rather than duplicating.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "emailDomain",
      label: "Email domain",
      type: "string",
      placeholder: "example.com",
      hint: "Unique across Companies. Copper uses it to associate inbound email with this record.",
    },
    {
      key: "address",
      label: "Address",
      type: "json",
      hint: "JSON object with `street`, `city`, `state`, `postal_code`, `country`.",
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "json",
      hint: 'JSON array, e.g. `[{"number": "415-123-4567", "category": "work"}]`.',
    },
    { key: "socials", label: "Socials", type: "json", hint: "JSON array of `{url, category}`." },
    { key: "websites", label: "Websites", type: "json", hint: "JSON array of `{url, category}`." },
    { key: "details", label: "Details", type: "text" },
    {
      key: "primaryContactId",
      label: "Primary contact (Person) ID",
      type: "number",
    },
    {
      key: "contactTypeId",
      label: "Contact type ID",
      type: "number",
      hint: "Read the ids from `GET /contact_types`.",
    },
    { key: "assigneeId", label: "Assignee (User) ID", type: "number" },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array of strings." },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new CopperClient(ctx).request("/companies", {
      method: "POST",
      body: compact({
        name: input.name,
        email_domain: input.emailDomain,
        address: input.address ?? undefined,
        phone_numbers: input.phoneNumbers ?? undefined,
        socials: input.socials ?? undefined,
        websites: input.websites ?? undefined,
        details: input.details,
        primary_contact_id: input.primaryContactId,
        contact_type_id: input.contactTypeId,
        assignee_id: input.assigneeId,
        tags: input.tags ?? undefined,
        custom_fields: input.customFields ?? undefined,
      }),
    });
  },
};

export default createCompany;
