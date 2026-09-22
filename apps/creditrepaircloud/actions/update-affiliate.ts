import type { ActionDefinition } from "@w6w/types";
import {
  AFFILIATE_UPDATE,
  CreditRepairCloudClient,
  ENVELOPE_OUTPUT,
  type ParsedResponse,
} from "../lib/client.ts";

/**
 * `POST /api/affiliate/updateRecord` — update an existing Affiliate record.
 *
 * ## The vendor's own `zip` / `post_code` inconsistency, preserved
 *
 * Insert documents the postal code as **`zip`**; Update documents the identical
 * concept, for the identical resource, as **`post_code`**. That is a genuine
 * inconsistency in the two pages' own Request Parameters tables (verified
 * 2026-09-22), not a transcription slip on this side — so this action sends
 * `post_code`, exactly as its own table says, and `insert-affiliate` sends
 * `zip`. "Correcting" either one to match the other would be inventing a field
 * name the vendor's documentation does not have for that method.
 *
 * ## What the Update table keeps, drops and omits
 *
 * - Required: `id`, `type`, `firstname`, `lastname`. `id` is absent from the
 *   page's table but present in its own example XML, and an update without it
 *   cannot name its record — required here, as on `update-lead`.
 * - Dropped from insert: `affiliate_portal_access`, `affiliate_userid` and
 *   `send_setup_password_info_via_email`, which the Update table does not list.
 * - `email` and `phone` are optional here, though `insert-affiliate` requires
 *   them: an update need not restate a phone number it is not changing.
 *
 * `idempotent: true` — the same values written twice leave the same record.
 */
const updateAffiliate: ActionDefinition<Record<string, unknown>, ParsedResponse> = {
  key: "update-affiliate",
  type: "perform",
  resource: "affiliate",
  title: "Update Affiliate",
  description: "Update a Credit Repair Cloud affiliate by id (POST /api/affiliate/updateRecord).",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Affiliate ID",
      type: "string",
      required: true,
      hint: "The id exactly as the API expects it — the vendor's example XML passes the encoded " +
        "form, not the plain integer shown in the CRM.",
    },
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
    },
    { key: "firstname", label: "First name", type: "string", required: true },
    { key: "lastname", label: "Last name", type: "string", required: true },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      advanced: true,
      options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }],
    },
    { key: "company", label: "Company", type: "string", advanced: true },
    { key: "company_url", label: "Company URL", type: "string", advanced: true },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "phone_ext", label: "Phone extension", type: "string", advanced: true },
    { key: "alternate_phone", label: "Alternate phone", type: "string", advanced: true },
    { key: "mailing_address", label: "Mailing address", type: "string", advanced: true },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "state", label: "State", type: "string", advanced: true },
    {
      key: "post_code",
      label: "Post code",
      type: "string",
      advanced: true,
      hint:
        "This Update table calls the postal code `post_code`; the Insert table calls the same " +
        "field `zip`. Matched per method, not unified — see this app's README.",
    },
    { key: "internal_note", label: "Internal note", type: "text", advanced: true },
  ],
  output: ENVELOPE_OUTPUT,

  execute(input, ctx) {
    return new CreditRepairCloudClient(ctx, AFFILIATE_UPDATE).send(input);
  },
};

export default updateAffiliate;
