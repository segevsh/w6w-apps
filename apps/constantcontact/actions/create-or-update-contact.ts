import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  emailAddress: string;
  listMemberships: string[];
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  companyName?: string;
  phoneNumber?: string;
  birthdayMonth?: number;
  birthdayDay?: number;
  anniversary?: string;
  customFields?: Array<Record<string, unknown>>;
  streetAddress?: Record<string, unknown>;
}

/**
 * `POST /v3/contacts/sign_up_form` — the upsert, and the one to reach for by
 * default.
 *
 * Despite the path, this is not limited to form submissions; it is the
 * vendor's documented "create a new contact or update an existing contact"
 * method. It keys on the email address: unknown address → `201` and a new
 * contact, known address → `200` and a **partial** update touching only the
 * properties you sent. `list_memberships` and `custom_fields` are *appended*
 * to what is already there, never replaced — the opposite of Update Contact's
 * PUT.
 *
 * `list_memberships` is required by the API (at least one `list_id`), so it is
 * required here too.
 *
 * Note the flatter body shape: `email_address` is a plain string, the address
 * is a single `street_address` object rather than an array, and there is one
 * `phone_number` string rather than a list. That is genuinely how this
 * endpoint differs from `POST /contacts`; it is not a simplification made
 * here.
 *
 * `idempotent: true` — replaying appends the same memberships and sets the
 * same values, which is a no-op the second time.
 */
const createOrUpdateContact: ActionDefinition<Input> = {
  key: "create-or-update-contact",
  type: "perform",
  resource: "contact",
  title: "Create or Update Contact",
  description:
    "Upsert a contact by email address. Updates are partial; list memberships and custom fields are appended, not replaced.",
  idempotent: true,
  params: [
    {
      key: "emailAddress",
      label: "Email address",
      type: "string",
      required: true,
      placeholder: "name@example.com",
      validation: { maxLength: 50 },
      hint: "The upsert key. 50 characters here, unlike the 80 that `POST /contacts` allows.",
    },
    {
      key: "listMemberships",
      label: "List IDs",
      type: "json",
      required: true,
      hint: "JSON array of at least one `list_id`, up to 50. Required by the API.",
    },
    { key: "firstName", label: "First name", type: "string", validation: { maxLength: 50 } },
    { key: "lastName", label: "Last name", type: "string", validation: { maxLength: 50 } },
    { key: "jobTitle", label: "Job title", type: "string", validation: { maxLength: 50 } },
    { key: "companyName", label: "Company name", type: "string", validation: { maxLength: 50 } },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      validation: { maxLength: 25 },
      hint: "A single number — this endpoint takes one, not an array.",
    },
    {
      key: "birthdayMonth",
      label: "Birthday month",
      type: "number",
      validation: { min: 1, max: 12, integer: true },
    },
    {
      key: "birthdayDay",
      label: "Birthday day",
      type: "number",
      validation: { min: 1, max: 31, integer: true },
    },
    { key: "anniversary", label: "Anniversary", type: "string" },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: 'JSON array of `{"custom_field_id": "…", "value": "…"}`. Appended, not replaced.',
    },
    {
      key: "streetAddress",
      label: "Street address",
      type: "json",
      hint:
        'A single JSON object: `{"kind": "home|work|other", "street": "…", "city": "…", "state": "…", "postal_code": "…", "country": "…"}`.',
    },
  ],
  output: [
    { key: "contact_id", type: "string", label: "Contact ID" },
    { key: "action", type: "string", label: "`created` or `updated`" },
  ],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const body: Record<string, unknown> = {
      email_address: input.emailAddress,
      list_memberships: input.listMemberships,
    };
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.lastName !== undefined) body.last_name = input.lastName;
    if (input.jobTitle !== undefined) body.job_title = input.jobTitle;
    if (input.companyName !== undefined) body.company_name = input.companyName;
    if (input.phoneNumber !== undefined) body.phone_number = input.phoneNumber;
    if (input.birthdayMonth !== undefined) body.birthday_month = input.birthdayMonth;
    if (input.birthdayDay !== undefined) body.birthday_day = input.birthdayDay;
    if (input.anniversary !== undefined) body.anniversary = input.anniversary;
    if (input.customFields) body.custom_fields = input.customFields;
    if (input.streetAddress) body.street_address = input.streetAddress;

    return client.request("/contacts/sign_up_form", { method: "POST", body });
  },
};

export default createOrUpdateContact;
