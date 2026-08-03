import type { ActionDefinition } from "@w6w/types";
import { CloseClient, compact, CUSTOM_FIELDS_PARAM, withCustomFields } from "../lib/client.ts";

interface Input {
  opportunityId: string;
  statusId?: string;
  value?: number;
  valuePeriod?: string;
  confidence?: number;
  note?: string;
  userId?: string;
  contactId?: string;
  dateWon?: string;
  customFields?: Record<string, unknown> | null;
}

/**
 * `PUT /opportunity/{id}/` — update an Opportunity.
 *
 * Moving a deal through the pipeline is `status_id`, and this is the action a
 * "deal won" workflow hangs off. `value` remains an integer in the currency's
 * minor unit on update exactly as on create — see `create-opportunity.ts` for
 * why that unit is what it is and why Close's own example does not settle it.
 *
 * `date_won` is settable directly, which matters for backfills: without it, a
 * deal imported after the fact would be dated when the API call ran rather than
 * when the deal actually closed, skewing every period report it lands in.
 *
 * Idempotent: setting a deal to the same stage and value twice is a no-op the
 * second time.
 */
const updateOpportunity: ActionDefinition<Input> = {
  key: "update-opportunity",
  type: "perform",
  resource: "opportunity",
  title: "Update Opportunity",
  description:
    "Update an Opportunity — most often to move it to another pipeline stage. Value is an " +
    "integer in the currency's minor unit.",
  idempotent: true,
  params: [
    {
      key: "opportunityId",
      label: "Opportunity ID",
      type: "string",
      required: true,
      placeholder: "oppo_...",
    },
    {
      key: "statusId",
      label: "Status ID",
      type: "string",
      placeholder: "stat_...",
      hint: "The new pipeline stage, from the List Statuses action. This is how a deal advances.",
    },
    {
      key: "value",
      label: "Value (minor unit)",
      type: "number",
      hint: "Integer in the currency's minor unit — cents for USD, so 50000 is $500.00.",
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
    },
    {
      key: "confidence",
      label: "Confidence (%)",
      type: "number",
      validation: { integer: true, min: 0, max: 100 },
    },
    { key: "note", label: "Note", type: "text" },
    { key: "userId", label: "Owner user ID", type: "string", placeholder: "user_..." },
    { key: "contactId", label: "Contact ID", type: "string", placeholder: "cont_..." },
    {
      key: "dateWon",
      label: "Date won",
      type: "date",
      hint:
        "Set explicitly when backfilling a deal that closed in the past, so period reports date " +
        "it correctly rather than to the moment of the API call.",
    },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "string", label: "Opportunity ID" }],

  execute(input, ctx) {
    const body = withCustomFields(
      compact({
        status_id: input.statusId,
        value: input.value,
        value_period: input.valuePeriod,
        confidence: input.confidence,
        note: input.note,
        user_id: input.userId,
        contact_id: input.contactId,
        date_won: input.dateWon,
      }),
      input.customFields,
    );
    return new CloseClient(ctx).request(
      `/opportunity/${encodeURIComponent(input.opportunityId)}/`,
      { method: "PUT", body },
    );
  },
};

export default updateOpportunity;
