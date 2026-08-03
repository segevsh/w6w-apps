import type { ActionDefinition } from "@w6w/types";
import { CloseClient, compact, CUSTOM_FIELDS_PARAM, withCustomFields } from "../lib/client.ts";

interface Input {
  leadId: string;
  statusId?: string;
  value?: number;
  valuePeriod?: string;
  confidence?: number;
  note?: string;
  userId?: string;
  contactId?: string;
  pipelineId?: string;
  customFields?: Record<string, unknown> | null;
}

/**
 * `POST /opportunity/` — create an Opportunity (a deal) on a Lead.
 *
 * ## `value` is an integer in the currency's MINOR UNIT (cents for USD)
 *
 * Close states this directly on its Reporting page — "Revenue fields are in
 * cents" — and `value` is typed as a plain `integer` in the schema with no
 * decimal component anywhere. So $500.00 is `50000`.
 *
 * **Close's own create example is internally inconsistent on this point and
 * should not be used to infer the unit.** It POSTs `"value": 500` and shows a
 * response carrying `"value": 50000` with `"value_formatted": "$50 monthly"` —
 * a request and response that cannot be from the same call, and a formatted
 * string that does not match either reading. What *is* self-consistent in that
 * response is the arithmetic: `annualized_value` 600000 is exactly
 * `value` 50000 x 12, and `expected_value` 45000 is exactly 90% of 50000. The
 * derived fields agree with each other and with the units being uniform;
 * only the human-readable string is off.
 *
 * The reliable way to confirm what a value landed as is the response's own
 * `value_formatted` and `value_currency` — Close renders those itself, so they
 * are ground truth for a given organization's currency.
 *
 * `value_period` qualifies recurring revenue — `one_time`, `monthly` or
 * `annual` — so a $500/month deal and a $500 one-off are distinguishable rather
 * than both being "500".
 *
 * `confidence` is a percentage, 0-100.
 *
 * Not idempotent: a retry creates a second deal on the same Lead.
 */
const createOpportunity: ActionDefinition<Input> = {
  key: "create-opportunity",
  type: "perform",
  resource: "opportunity",
  title: "Create Opportunity",
  description:
    "Create an Opportunity on a Lead. Monetary value is an integer in the currency's minor unit " +
    "— 50000 means $500.00.",
  idempotent: false,
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true, placeholder: "lead_..." },
    {
      key: "statusId",
      label: "Status ID",
      type: "string",
      placeholder: "stat_...",
      hint: "Pipeline stage, from the List Statuses action. Omit for the pipeline's default.",
    },
    {
      key: "value",
      label: "Value (minor unit)",
      type: "number",
      hint:
        "Integer in the currency's minor unit — cents for USD, so 50000 is $500.00. Check the " +
        "response's `value_formatted` to confirm how Close rendered it.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "valuePeriod",
      label: "Value period",
      type: "select",
      options: [
        { value: "one_time", label: "One time" },
        { value: "monthly", label: "Monthly" },
        { value: "annual", label: "Annual" },
      ],
      hint: "Whether the value recurs. Defaults to one time.",
    },
    {
      key: "confidence",
      label: "Confidence (%)",
      type: "number",
      hint: "Probability of closing, 0–100.",
      validation: { integer: true, min: 0, max: 100 },
    },
    { key: "note", label: "Note", type: "text" },
    {
      key: "userId",
      label: "Owner user ID",
      type: "string",
      placeholder: "user_...",
      hint: "Who owns the deal. Defaults to the API key's own user.",
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      placeholder: "cont_...",
      hint: "The primary Contact for this deal. Must belong to the same Lead.",
    },
    { key: "pipelineId", label: "Pipeline ID", type: "string", placeholder: "pipe_..." },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "string", label: "Opportunity ID" }],

  execute(input, ctx) {
    const body = withCustomFields(
      compact({
        lead_id: input.leadId,
        status_id: input.statusId,
        value: input.value,
        value_period: input.valuePeriod,
        confidence: input.confidence,
        note: input.note,
        user_id: input.userId,
        contact_id: input.contactId,
        pipeline_id: input.pipelineId,
      }),
      input.customFields,
    );
    return new CloseClient(ctx).request("/opportunity/", { method: "POST", body });
  },
};

export default createOpportunity;
