import type { ActionDefinition } from "@w6w/types";
import {
  CreditRepairCloudClient,
  ENVELOPE_OUTPUT,
  LEAD_INSERT,
  type ParsedResponse,
} from "../lib/client.ts";

/**
 * `POST /api/lead/insertRecord` — create a Lead/Client record.
 *
 * Field-for-field from the vendor's own "Insert records" page (read
 * 2026-09-22), with three deliberate omissions and one disclosure:
 *
 *  - **`phone_work_ext` and `fax` are left out.** Both appear in that page's
 *    example XML but are absent from its own Request Parameters table. Where
 *    the two disagree, this app builds only what the table documents; the
 *    README records the gap.
 *  - **`type` is a select of the five documented values**, including the
 *    literal `Lead/Inactive` — which is what the docs list, matched — but the
 *    hint says so plainly, because a company can add custom statuses in Credit
 *    Repair Cloud and the API accepts them as free text too. The select is a
 *    convenience, not a closed enum the API enforces.
 *  - **Three fields only mean something when `client_portal_access` is `on`**
 *    (`client_userid`, and the setup-password email that turns portal access
 *    into a working login). They are still declared unconditionally: the vendor
 *    documents no dependency between them, and an Action that silently drops a
 *    value the caller supplied is worse than one that sends it.
 *
 * `idempotent: false` — the vendor accepts no idempotency key of any kind, and
 * a retry after a lost response creates a second record rather than completing
 * the first.
 */
const insertLead: ActionDefinition<Record<string, unknown>, ParsedResponse> = {
  key: "insert-lead",
  type: "perform",
  resource: "lead",
  title: "Insert Lead",
  description: "Create a Credit Repair Cloud lead or client record (POST /api/lead/insertRecord).",
  idempotent: false,
  params: [
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
      hint: "Documented verbatim, including the literal `Lead/Inactive`. A company can add its " +
        "own custom statuses in Credit Repair Cloud and the API accepts those too — this select " +
        "lists the five the docs name, and free text is valid.",
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
      key: "client_portal_access",
      label: "Client portal access",
      type: "select",
      advanced: true,
      options: [{ value: "on", label: "on" }, { value: "off", label: "off" }],
    },
    {
      key: "client_userid",
      label: "Client portal user id",
      type: "string",
      advanced: true,
      hint: "An email address. Only meaningful when client portal access is `on`.",
    },
    {
      key: "client_agreement",
      label: "Client agreement",
      type: "string",
      advanced: true,
    },
    {
      key: "send_setup_password_info_via_email",
      label: "Send setup password email",
      type: "select",
      advanced: true,
      options: [{ value: "yes", label: "yes" }, { value: "no", label: "no" }],
      hint: "Only meaningful when client portal access is `on`.",
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
    return new CreditRepairCloudClient(ctx, LEAD_INSERT).send(input);
  },
};

export default insertLead;
