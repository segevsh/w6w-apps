import type { ActionDefinition } from "@w6w/types";
import { FubClient } from "../lib/client.ts";

interface Input {
  personId: number;
  actionPlanId: number;
}

/**
 * `POST /actionPlansPeople` — start a follow-up sequence for a contact.
 *
 * The manual counterpart to what Create Event does automatically: an event of
 * the right type fires whatever action plan the account's Lead Flow configures,
 * while this starts a *specific* named plan for a *specific* person on demand.
 * That is the useful case for a workflow — "when this deal stage changes, put
 * the client on the post-closing nurture plan" — which no lead event models.
 *
 * Both fields are required by the schema. `actionPlanId` comes from the List
 * Action Plans action.
 *
 * `idempotent: false`: this creates a plan-to-person association, and re-running
 * it is a request to start the plan again rather than a no-op.
 *
 * ## Two things worth knowing before wiring this up
 *
 *  1. **Deprecation.** The endpoint carries Follow Up Boss's notice: "This
 *     endpoint is planned for deprecation as part of the Automations 2.0
 *     rollout. While no date has been set, we will provide a clear migration
 *     path shortly." Shipped with the warning attached — it works today, and
 *     there is nothing published to migrate to yet.
 *  2. **Marking a contact as contacted pauses plans.** Update Person's
 *     `contacted` field, set to true, "will pause action plans". So a workflow
 *     that applies a plan here and then flips `contacted` elsewhere will stop
 *     the sequence it just started. The two actions interact, and nothing in
 *     either response says so.
 */
const applyActionPlan: ActionDefinition<Input> = {
  key: "apply-action-plan",
  type: "perform",
  resource: "action-plan",
  title: "Apply Action Plan",
  idempotent: false,
  description:
    "Start a named Action Plan for a contact — the on-demand counterpart to the plans that lead " +
    "events fire automatically. Note that setting a contact's `contacted` flag to true elsewhere " +
    "will pause the plan. Flagged by Follow Up Boss for eventual deprecation under Automations " +
    "2.0, with no date set.",
  params: [
    {
      key: "personId",
      label: "Person id",
      type: "number",
      required: true,
      hint: "The contact to put on the plan.",
    },
    {
      key: "actionPlanId",
      label: "Action plan id",
      type: "number",
      required: true,
      hint: "Which plan to start. Ids come from the List Action Plans action.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Action-plan-to-person association id" }],

  execute(input, ctx) {
    return new FubClient(ctx).request("/actionPlansPeople", {
      method: "POST",
      body: { personId: input.personId, actionPlanId: input.actionPlanId },
    });
  },
};

export default applyActionPlan;
