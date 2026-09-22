import type { ActionDefinition } from "@w6w/types";
import {
  AFFILIATE_INSERT,
  CreditRepairCloudClient,
  ENVELOPE_OUTPUT,
  type ParsedResponse,
} from "../lib/client.ts";

/**
 * `POST /api/affiliate/insertRecord` — create an Affiliate record.
 *
 * Affiliates are a separate resource with their own four endpoints, not a flag
 * on a lead: they have their own status vocabulary (`Active`, `Inactive`,
 * `Pending`), their own optional fields (company, website, gender) and their
 * own portal access.
 *
 * Two documented gaps, handled the same way as `insert-lead`'s:
 *
 *  - **`fax` is left out.** It appears in this page's example XML but not in its
 *    Request Parameters table, so it is not sent. (`update-lead`'s and this
 *    page's `post_code`-vs-`zip` split is a different kind of gap — see
 *    `update-affiliate.ts`.)
 *  - **`type` is a select of the three documented values** while remaining free
 *    text in practice, the same as the lead side.
 *
 * `idempotent: false` — a retry after a lost response creates a second
 * affiliate, and the vendor accepts no idempotency key.
 */
const insertAffiliate: ActionDefinition<Record<string, unknown>, ParsedResponse> = {
  key: "insert-affiliate",
  type: "perform",
  resource: "affiliate",
  title: "Insert Affiliate",
  description: "Create a Credit Repair Cloud affiliate (POST /api/affiliate/insertRecord).",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
        { value: "Pending", label: "Pending" },
      ],
      hint: "Documented verbatim. Custom affiliate statuses a company has added are accepted as " +
        "free text as well.",
    },
    { key: "firstname", label: "First name", type: "string", required: true },
    { key: "lastname", label: "Last name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "phone", label: "Phone", type: "string", required: true },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      advanced: true,
      options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }],
    },
    { key: "company", label: "Company", type: "string", advanced: true },
    { key: "company_url", label: "Company URL", type: "string", advanced: true },
    { key: "phone_ext", label: "Phone extension", type: "string", advanced: true },
    { key: "alternate_phone", label: "Alternate phone", type: "string", advanced: true },
    { key: "mailing_address", label: "Mailing address", type: "string", advanced: true },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "state", label: "State", type: "string", advanced: true },
    {
      key: "zip",
      label: "Zip",
      type: "string",
      advanced: true,
      hint: "Called `post_code` in this vendor's Update table for the identical concept — the " +
        "API takes this name on insert.",
    },
    { key: "internal_note", label: "Internal note", type: "text", advanced: true },
    {
      key: "affiliate_portal_access",
      label: "Affiliate portal access",
      type: "select",
      advanced: true,
      options: [{ value: "on", label: "on" }, { value: "off", label: "off" }],
    },
    {
      key: "affiliate_userid",
      label: "Affiliate portal user id",
      type: "string",
      advanced: true,
      hint: "An email address. Only meaningful when affiliate portal access is `on`.",
    },
    {
      key: "send_setup_password_info_via_email",
      label: "Send setup password email",
      type: "select",
      advanced: true,
      options: [{ value: "yes", label: "yes" }, { value: "no", label: "no" }],
      hint: "Only meaningful when affiliate portal access is `on`.",
    },
  ],
  output: ENVELOPE_OUTPUT,

  execute(input, ctx) {
    return new CreditRepairCloudClient(ctx, AFFILIATE_INSERT).send(input);
  },
};

export default insertAffiliate;
