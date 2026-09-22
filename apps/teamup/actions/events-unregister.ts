/**
 * `POST /api/v2/events/{id}/unregister` — take a customer off an event.
 *
 * `customer` is required. `is_late_cancel` records the cancellation as late —
 * the threshold it is measured against is the event's own
 * `late_cancel_deadline`, and it is what a membership's penalty terms key off.
 *
 * The response is `{"late": <string>, "attendance": <int>}`: TeamUp reports
 * whether the cancellation counted as late as a **string**, not a boolean.
 * This action returns the body exactly as it arrived rather than normalising a
 * field whose vocabulary the reference does not publish.
 */
import type { ActionDefinition } from "@w6w/types";
import { compact, TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";

interface Input extends CommonInput {
  id: number;
  customer: number;
  is_late_cancel?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "events-unregister",
  type: "perform",
  resource: "event",
  title: "Unregister from Event",
  description:
    "Take a customer off one event, recording whether it counts as a late cancellation (POST " +
    "/api/v2/events/{id}/unregister).",
  idempotent: true,
  params: [
    {
      key: "customer",
      label: "Customer ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "is_late_cancel",
      label: "Late cancellation",
      type: "boolean",
      hint: "Record this cancellation as late.",
    },
    idParam("The event `id` from List Events or Create Event."),
    ...commonParams(),
  ],
  output: [{ key: "late", type: "string", label: "Reported as late" }, {
    key: "attendance",
    type: "number",
    label: "Attendance ID",
  }],

  execute(input, ctx) {
    const body = compact({
      customer: input.customer,
      is_late_cancel: input.is_late_cancel,
    });
    return new TeamUpClient(ctx).request(`/events/${input.id}/unregister`, {
      method: "POST",
      body,
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
