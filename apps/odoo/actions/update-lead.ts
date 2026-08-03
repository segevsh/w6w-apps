import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, mergeValues, OdooClient, toIds, VALUES_PARAM } from "../lib/client.ts";

interface Input {
  ids: unknown;
  name?: string;
  stageId?: number;
  partnerId?: number;
  expectedRevenue?: number;
  probability?: number;
  values?: unknown;
  context?: Record<string, unknown>;
}

/**
 * `crm.lead.write` — update leads or opportunities.
 *
 * Moving a card along the pipeline is a `stage_id` write. Stage ids are per
 * database (they are `crm.stage` records the customer configures), so there is
 * no useful fixed option list to offer — use the Search Records action against
 * `crm.stage` to discover them.
 *
 * A note on `probability`: Odoo normally computes it from the stage, and writing
 * it explicitly switches the record to a manually-set probability. That is a
 * real behaviour change, not just a field update, which is why it is labelled
 * rather than hidden in the escape hatch.
 *
 * `idempotent: true`: writing the same values again yields the same state.
 */
const updateLead: ActionDefinition<Input> = {
  key: "update-lead",
  type: "perform",
  resource: "crm.lead",
  title: "Update Lead",
  description:
    "Update one or more CRM leads or opportunities (`crm.lead`) — including moving them to " +
    "another pipeline stage. Only the fields you supply are changed.",
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "Record IDs",
      type: "string",
      required: true,
      placeholder: "27",
      hint: "A single id, or several separated by commas — all get the same values.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "stageId",
      label: "Stage ID",
      type: "number",
      hint:
        "Record id of a `crm.stage`. Stages are configured per database — use Search Records on " +
        "`crm.stage` to list them.",
    },
    {
      key: "partnerId",
      label: "Customer ID",
      type: "number",
      hint: "Record id of a contact to link (`partner_id`).",
    },
    { key: "expectedRevenue", label: "Expected Revenue", type: "number", row: "forecast" },
    {
      key: "probability",
      label: "Probability",
      type: "number",
      row: "forecast",
      hint: "Percentage 0–100. Odoo normally derives this from the stage; setting it explicitly " +
        "switches the record to a manually-set probability.",
    },
    VALUES_PARAM,
    CONTEXT_PARAM,
  ],
  output: [
    { key: "updated", type: "boolean", label: "Whether Odoo accepted the write" },
    { key: "ids", type: "array", label: "Record ids written" },
  ],

  async execute(input, ctx) {
    const vals = mergeValues({
      name: input.name,
      stage_id: input.stageId,
      partner_id: input.partnerId,
      expected_revenue: input.expectedRevenue,
      probability: input.probability,
    }, input.values);

    if (Object.keys(vals).length === 0) {
      throw new Error("Update Lead needs at least one field to change.");
    }

    const ids = toIds(input.ids);
    const kwargs: Record<string, unknown> = {};
    if (input.context) kwargs.context = input.context;

    const updated = await OdooClient.fromConnection(ctx).call<boolean>(
      "crm.lead",
      "write",
      [ids, vals],
      kwargs,
    );
    return { updated, ids };
  },
};

export default updateLead;
