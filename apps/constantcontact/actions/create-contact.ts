import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  emailAddress: string;
  permissionToSend?: "implicit" | "explicit" | "pending_confirmation" | "unsubscribed";
  createSource?: "Account" | "Contact";
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  companyName?: string;
  birthdayMonth?: number;
  birthdayDay?: number;
  anniversary?: string;
  listMemberships?: string[];
  taggings?: string[];
  customFields?: Array<Record<string, unknown>>;
  phoneNumbers?: Array<Record<string, unknown>>;
  streetAddresses?: Array<Record<string, unknown>>;
}

/**
 * `POST /v3/contacts` — a strict CREATE. It answers `409 Conflict` when the
 * email address already exists; it does not merge. For "create it or update
 * it, whichever applies", use Create or Update Contact, which is a different
 * endpoint with genuinely different semantics.
 *
 * `create_source` is not decoration. Constant Contact's own docs call it out
 * for compliance: it records whether the *account* added this person or the
 * *contact* signed themselves up, and the vendor expects an integration to
 * report it accurately. A workflow pushing contacts out of a CRM is `Account`;
 * a form submission the contact filled in themselves is `Contact`. The default
 * here is `Account` because that is what a server-side automation almost
 * always is.
 *
 * `idempotent: false` — a retry after a successful create hits the 409, which
 * is a different outcome from the first call.
 */
const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a new contact. Fails with 409 if the email already exists — use Create or Update Contact to upsert.",
  idempotent: false,
  params: [
    {
      key: "emailAddress",
      label: "Email address",
      type: "string",
      required: true,
      placeholder: "name@example.com",
      validation: { maxLength: 80 },
    },
    {
      key: "permissionToSend",
      label: "Permission to send",
      type: "select",
      hint:
        "Only set this where the contact has actually given permission — opting somebody in without their consent breaches Constant Contact's terms of service.",
      options: [
        { value: "implicit", label: "Implicit (existing business relationship)" },
        { value: "explicit", label: "Explicit (they asked to be emailed)" },
        { value: "pending_confirmation", label: "Pending confirmation" },
        { value: "unsubscribed", label: "Unsubscribed" },
      ],
    },
    {
      key: "createSource",
      label: "Create source",
      type: "select",
      default: "Account",
      hint: "Who added this contact. Constant Contact requires this to be accurate for compliance.",
      options: [
        { value: "Account", label: "Account (added by you)" },
        { value: "Contact", label: "Contact (they signed themselves up)" },
      ],
    },
    { key: "firstName", label: "First name", type: "string", validation: { maxLength: 50 } },
    { key: "lastName", label: "Last name", type: "string", validation: { maxLength: 50 } },
    { key: "jobTitle", label: "Job title", type: "string", validation: { maxLength: 50 } },
    { key: "companyName", label: "Company name", type: "string", validation: { maxLength: 50 } },
    {
      key: "birthdayMonth",
      label: "Birthday month",
      type: "number",
      validation: { min: 1, max: 12, integer: true },
      hint: "Must be sent together with Birthday day.",
    },
    {
      key: "birthdayDay",
      label: "Birthday day",
      type: "number",
      validation: { min: 1, max: 31, integer: true },
      hint: "Must be sent together with Birthday month.",
    },
    {
      key: "anniversary",
      label: "Anniversary",
      type: "string",
      hint: "MM/DD/YYYY, YYYY/MM/DD, YYYY-MM-DD or MM-DD-YYYY.",
    },
    {
      key: "listMemberships",
      label: "List IDs",
      type: "json",
      hint: "JSON array of `list_id` values, up to 50.",
    },
    {
      key: "taggings",
      label: "Tag IDs",
      type: "json",
      hint: "JSON array of `tag_id` values, up to 50.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint:
        'JSON array of `{"custom_field_id": "…", "value": "…"}`, up to 25. IDs come from List Custom Fields.',
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "json",
      hint: 'JSON array of `{"phone_number": "…", "kind": "home|work|mobile|other"}`, up to 3.',
    },
    {
      key: "streetAddresses",
      label: "Street addresses",
      type: "json",
      hint: 'JSON array of `{"kind": "home|work|other", "street": "…", "city": "…", …}`, up to 3.',
    },
  ],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const email: Record<string, unknown> = { address: input.emailAddress };
    if (input.permissionToSend) email.permission_to_send = input.permissionToSend;

    const body: Record<string, unknown> = {
      email_address: email,
      create_source: input.createSource ?? "Account",
    };
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.lastName !== undefined) body.last_name = input.lastName;
    if (input.jobTitle !== undefined) body.job_title = input.jobTitle;
    if (input.companyName !== undefined) body.company_name = input.companyName;
    if (input.birthdayMonth !== undefined) body.birthday_month = input.birthdayMonth;
    if (input.birthdayDay !== undefined) body.birthday_day = input.birthdayDay;
    if (input.anniversary !== undefined) body.anniversary = input.anniversary;
    if (input.listMemberships) body.list_memberships = input.listMemberships;
    if (input.taggings) body.taggings = input.taggings;
    if (input.customFields) body.custom_fields = input.customFields;
    if (input.phoneNumbers) body.phone_numbers = input.phoneNumbers;
    if (input.streetAddresses) body.street_addresses = input.streetAddresses;

    return client.request("/contacts", { method: "POST", body });
  },
};

export default createContact;
