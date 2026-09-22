import type { ActionDefinition } from "@w6w/types";
import {
  CreditRepairCloudClient,
  ENVELOPE_OUTPUT,
  LEAD_UPDATE,
  type ParsedResponse,
} from "../lib/client.ts";

/**
 * `POST /api/lead/updateRecord` — update an existing Lead/Client record.
 *
 * Two things are worth stating, because both are places the vendor's own docs
 * are incomplete rather than wrong:
 *
 *  - **`id` is required, and the page's Request Parameters table does not list
 *    it.** The method's own example XML carries `<id>`, and an update that
 *    cannot name the record it updates is not an update. Required here; the
 *    README records that this completes a documented gap using the vendor's own
 *    example, rather than inventing a field.
 *  - **The four portal/agreement fields `insert-lead` sends are gone.** The
 *    Update table drops `client_portal_access`, `client_userid`,
 *    `client_agreement` and `send_setup_password_info_via_email`; a caller that
 *    needs to change portal access does it in the Credit Repair Cloud UI, not
 *    through this method.
 *
 * `idempotent: true` — writing the same field values to the same record twice
 * leaves the record in the same state. The vendor exposes no ETag or version
 * field to guard against a concurrent write, so "same values, same result" is
 * the whole claim being made.
 */
const updateLead: ActionDefinition<Record<string, unknown>, ParsedResponse> = {
  key: "update-lead",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description:
    "Update a Credit Repair Cloud lead or client record by id (POST /api/lead/updateRecord).",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The id exactly as the API expects it. The vendor's own example XML passes the " +
        "encoded form (`<id>MQ==</id>`), not the plain integer shown in the CRM.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "Client", label: "Client" },
        { value: "Lead", label: "Lead" },
        { value: "Lead/Inactive", label: "Lead/Inactive" },
        { value: "Inactive", label: "Inactive" },
        { value: "Suspended", label: "Suspended" },
      ],
      hint: "Documented verbatim, including the literal `Lead/Inactive`. Custom statuses a " +
        "company has added are also accepted as free text.",
    },
    { key: "firstname", label: "First name", type: "string", required: true },
    { key: "lastname", label: "Last name", type: "string", required: true },
    { key: "middlename", label: "Middle name", type: "string", advanced: true },
    { key: "suffix", label: "Suffix", type: "string", advanced: true, placeholder: "Jr." },
    { key: "email", label: "Email", type: "string" },
    { key: "phone_home", label: "Phone (home)", type: "string" },
    { key: "phone_work", label: "Phone (work)", type: "string" },
    { key: "phone_mobile", label: "Phone (mobile)", type: "string" },
    { key: "street_address", label: "Street address", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "post_code", label: "Post code", type: "string" },
    { key: "ssno", label: "SSN", type: "string", advanced: true },
    {
      key: "birth_date",
      label: "Birth date",
      type: "string",
      advanced: true,
      placeholder: "mm/dd/yyyy",
      hint: "The vendor's documented format is mm/dd/yyyy.",
    },
    { key: "memo", label: "Memo", type: "text", advanced: true },
    {
      key: "previous_mailing_address",
      label: "Previous mailing address",
      type: "string",
      advanced: true,
    },
    { key: "previous_city", label: "Previous city", type: "string", advanced: true },
    { key: "previous_state", label: "Previous state", type: "string", advanced: true },
    { key: "previous_zip", label: "Previous zip", type: "string", advanced: true },
    {
      key: "client_assigned_to",
      label: "Assigned to",
      type: "string",
      advanced: true,
      hint: "Comma-separated user names, e.g. `Jane Doe,John Smith`.",
    },
    {
      key: "referred_by_firstname",
      label: "Referred by (first name)",
      type: "string",
      advanced: true,
    },
    {
      key: "referred_by_lastname",
      label: "Referred by (last name)",
      type: "string",
      advanced: true,
    },
    { key: "referred_by_email", label: "Referred by (email)", type: "string", advanced: true },
  ],
  output: ENVELOPE_OUTPUT,

  execute(input, ctx) {
    return new CreditRepairCloudClient(ctx, LEAD_UPDATE).send(input);
  },
};

export default updateLead;
