import type { ActionDefinition } from "@w6w/types";
import { GravityFormsClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
  fieldValues: Record<string, unknown>;
  createdBy?: number;
  dateCreated?: string;
  ip?: string;
  sourceUrl?: string;
  userAgent?: string;
  status?: string;
  isRead?: boolean;
  isStarred?: boolean;
  isFulfilled?: boolean;
  paymentAmount?: string;
  paymentDate?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionId?: string;
  transactionType?: string;
}

/**
 * `POST /gf/v2/forms/[FORM_ID]/entries` — write an entry directly.
 *
 * ## Read this before choosing it over Submit Form
 *
 * This endpoint creates the database row and nothing else. It does NOT run the
 * form's validation, anti-spam checks, add-on feeds, notifications or
 * confirmations — those belong to the submissions endpoint, which is the
 * `form-submit` action. Use this one for imports and back-fills, where firing
 * a payment feed or emailing a customer would be wrong.
 *
 * ## Addressing values
 *
 * Field values are keyed by **field ID**, using the dotted form for the
 * sub-inputs of a composite field: `{"1.3": "Neil", "1.6": "Armstrong",
 * "3": "neil@example.com"}`. Note this differs from Submit Form, which keys by
 * input NAME (`input_1_3`). Get Form returns the field IDs.
 *
 * The vendor also exposes `POST /gf/v2/entries` with `form_id` in the body; the
 * form-scoped route used here is equivalent and keeps the ID out of the payload.
 *
 * The three `is_*` flags and the payment properties are documented entry
 * properties. Gravity Forms takes the flags as 0/1 integers, so the booleans
 * collected here are converted on the way out.
 *
 * Capability: `gravityforms_edit_entries`.
 */
const entryCreate: ActionDefinition<Input> = {
  key: "entry-create",
  type: "perform",
  resource: "entry",
  title: "Create Entry",
  description:
    "Write an entry directly, skipping validation, feeds, notifications and confirmations. Use Submit Form when those should run.",
  // A fresh entry per POST, with no request key to dedupe on: a retry creates a
  // second entry.
  idempotent: false,
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "fieldValues",
      label: "Field Values",
      type: "json",
      required: true,
      hint: 'Keyed by field ID, e.g. {"1.3":"Neil","1.6":"Armstrong","3":"neil@example.com"}. ' +
        "Use Get Form for the IDs. Composite fields use the dotted sub-input form.",
    },
    { key: "createdBy", label: "Created By (user ID)", type: "number" },
    {
      key: "dateCreated",
      label: "Date Created",
      type: "string",
      hint: "`Y-m-d H:i:s` in UTC, e.g. `2026-08-03 19:30:44`. Defaults to now.",
    },
    { key: "ip", label: "IP Address", type: "string" },
    { key: "sourceUrl", label: "Source URL", type: "string" },
    { key: "userAgent", label: "User Agent", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "spam", label: "Spam" },
        { value: "trash", label: "Trash" },
      ],
    },
    { key: "isRead", label: "Mark Read", type: "boolean" },
    { key: "isStarred", label: "Mark Starred", type: "boolean" },
    { key: "isFulfilled", label: "Mark Fulfilled", type: "boolean" },
    { key: "paymentAmount", label: "Payment Amount", type: "string" },
    { key: "paymentDate", label: "Payment Date", type: "string" },
    { key: "paymentMethod", label: "Payment Method", type: "string" },
    { key: "paymentStatus", label: "Payment Status", type: "string" },
    { key: "transactionId", label: "Transaction ID", type: "string" },
    { key: "transactionType", label: "Transaction Type", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Entry ID" },
    { key: "form_id", type: "string", label: "Form ID" },
    { key: "date_created", type: "string", label: "Created (site time)" },
    { key: "status", type: "string", label: "Entry status" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating Gravity Forms entry", { formId: input.formId });
    const client = GravityFormsClient.fromConnection(ctx);

    const body: Record<string, unknown> = { ...(input.fieldValues ?? {}) };
    const flag = (v: boolean | undefined) => (v === undefined ? undefined : v ? 1 : 0);
    const props: Record<string, unknown> = {
      created_by: input.createdBy,
      date_created: input.dateCreated,
      ip: input.ip,
      source_url: input.sourceUrl,
      user_agent: input.userAgent,
      status: input.status,
      is_read: flag(input.isRead),
      is_starred: flag(input.isStarred),
      is_fulfilled: flag(input.isFulfilled),
      payment_amount: input.paymentAmount,
      payment_date: input.paymentDate,
      payment_method: input.paymentMethod,
      payment_status: input.paymentStatus,
      transaction_id: input.transactionId,
      transaction_type: input.transactionType,
    };
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined && v !== null && v !== "") body[k] = v;
    }

    return client.request(
      `/forms/${encodeURIComponent(String(input.formId))}/entries`,
      { method: "POST", body },
    );
  },
};

export default entryCreate;
