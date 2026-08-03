import type { ActionDefinition } from "@w6w/types";
import { compact, CopperClient, CUSTOM_FIELDS_PARAM } from "../lib/client.ts";

interface Input {
  companyId: number | string;
  name?: string;
  emailDomain?: string | null;
  address?: Record<string, unknown> | null;
  phoneNumbers?: unknown[] | null;
  socials?: unknown[] | null;
  websites?: unknown[] | null;
  details?: string | null;
  primaryContactId?: number | null;
  contactTypeId?: number | null;
  assigneeId?: number | null;
  tags?: string[] | null;
  customFields?: unknown[] | null;
}

/**
 * `PUT /companies/{id}` — update a Company.
 *
 * Same PATCH-like semantics as every Copper PUT: only fields present in the body
 * change, and an explicit `null` clears one. Fields left blank here are stripped
 * by `compact` and so are left alone.
 *
 * Idempotent: applying the same body twice leaves the same record.
 */
const updateCompany: ActionDefinition<Input> = {
  key: "update-company",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description:
    "Update a Company. Only the fields you supply change; send an explicit `null` to clear one.",
  idempotent: true,
  params: [
    { key: "companyId", label: "Company ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "emailDomain",
      label: "Email domain",
      type: "string",
      hint: "Unique across Companies — reusing another Company's domain fails.",
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
      hint: "JSON array of `{number, category}`. Replaces the whole list.",
    },
    { key: "socials", label: "Socials", type: "json", hint: "JSON array of `{url, category}`." },
    { key: "websites", label: "Websites", type: "json", hint: "JSON array of `{url, category}`." },
    { key: "details", label: "Details", type: "text" },
    { key: "primaryContactId", label: "Primary contact (Person) ID", type: "number" },
    { key: "contactTypeId", label: "Contact type ID", type: "number" },
    { key: "assigneeId", label: "Assignee (User) ID", type: "number" },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array of strings. Replaces the list." },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "date_modified", type: "number", label: "Modified at (Unix seconds)" },
  ],

  execute(input, ctx) {
    return new CopperClient(ctx).request(
      `/companies/${encodeURIComponent(String(input.companyId))}`,
      {
        method: "PUT",
        body: compact({
          name: input.name,
          email_domain: input.emailDomain,
          address: input.address,
          phone_numbers: input.phoneNumbers,
          socials: input.socials,
          websites: input.websites,
          details: input.details,
          primary_contact_id: input.primaryContactId,
          contact_type_id: input.contactTypeId,
          assignee_id: input.assigneeId,
          tags: input.tags,
          custom_fields: input.customFields,
        }),
      },
    );
  },
};

export default updateCompany;
