import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  emailAddress: string;
  updateSource?: "Account" | "Contact";
  permissionToSend?: "implicit" | "explicit" | "pending_confirmation" | "unsubscribed";
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
 * `PUT /v3/contacts/{contact_id}` — a **full replace**, and the sharpest edge
 * in this app.
 *
 * The vendor's own wording: "all properties are updated, overwriting all
 * previous values. Any properties left blank or not included in the request
 * are overwritten with null value." So a PUT carrying only an email address
 * silently erases `first_name`, `last_name`, `job_title`, `company_name`, the
 * birthday and the anniversary.
 *
 * Two carve-outs soften it, and only two:
 *
 *   - **Sub-resources are not nulled by omission.** Leave `list_memberships`,
 *     `taggings`, `custom_fields`, `phone_numbers` or `street_addresses` out
 *     and they survive untouched. Include one and it replaces the whole array.
 *   - A **deleted** contact is revived by a PUT with `update_source:
 *     "Account"`.
 *
 * `email_address.address` and `update_source` are both required by the API,
 * which is why they are required params here rather than optional ones.
 *
 * For a partial update, use Create or Update Contact instead — that endpoint
 * merges. This one is for when you genuinely hold the whole record.
 *
 * `idempotent: true` — replaying the same complete representation lands the
 * contact in the same state.
 */
const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact (replace)",
  description:
    "Replace a contact wholesale. Omitted top-level properties are set to null; omitted sub-resources are left alone.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "emailAddress",
      label: "Email address",
      type: "string",
      required: true,
      validation: { maxLength: 80 },
      hint: "Required by the API on every PUT, even when it is unchanged.",
    },
    {
      key: "updateSource",
      label: "Update source",
      type: "select",
      default: "Account",
      hint: "Required by the API. Use `Account` to revive a deleted contact.",
      options: [
        { value: "Account", label: "Account" },
        { value: "Contact", label: "Contact" },
      ],
    },
    {
      key: "permissionToSend",
      label: "Permission to send",
      type: "select",
      options: [
        { value: "implicit", label: "Implicit" },
        { value: "explicit", label: "Explicit" },
        { value: "pending_confirmation", label: "Pending confirmation" },
        { value: "unsubscribed", label: "Unsubscribed" },
      ],
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
      validation: { maxLength: 50 },
      hint: "Omitting this CLEARS the existing value.",
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
      validation: { maxLength: 50 },
      hint: "Omitting this CLEARS the existing value.",
    },
    { key: "jobTitle", label: "Job title", type: "string", validation: { maxLength: 50 } },
    { key: "companyName", label: "Company name", type: "string", validation: { maxLength: 50 } },
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
      key: "listMemberships",
      label: "List IDs",
      type: "json",
      hint: "JSON array. Omit to leave memberships alone; supply to replace them entirely.",
    },
    {
      key: "taggings",
      label: "Tag IDs",
      type: "json",
      hint: "JSON array. Omit to leave tags alone; supply to replace them entirely.",
    },
    { key: "customFields", label: "Custom fields", type: "json" },
    { key: "phoneNumbers", label: "Phone numbers", type: "json" },
    { key: "streetAddresses", label: "Street addresses", type: "json" },
  ],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    const email: Record<string, unknown> = { address: input.emailAddress };
    if (input.permissionToSend) email.permission_to_send = input.permissionToSend;

    const body: Record<string, unknown> = {
      email_address: email,
      update_source: input.updateSource ?? "Account",
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

    return client.request(`/contacts/${encodeURIComponent(input.contactId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default updateContact;
