/**
 * `POST /api/v2/events/{id}/leave_waitlist` — give up a waitlist spot.
 *
 * The counterpart to `events-join-waitlist`, and the cleanup step for a
 * customer who found another class. `customer` is required.
 *
 * The response is deliberately minimal — `{"customer": <int>}` — so it
 * confirms which customer was removed rather than returning a spot that no
 * longer exists.
 */
import type { ActionDefinition } from "@w6w/types";
import { compact, TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";

interface Input extends CommonInput {
  id: number;
  customer: number;
}

const action: ActionDefinition<Input> = {
  key: "events-leave-waitlist",
  type: "perform",
  resource: "event",
  title: "Leave Event Waitlist",
  description:
    "Remove a customer's waitlist spot for one event (POST /api/v2/events/{id}/leave_waitlist).",
  idempotent: true,
  params: [
    {
      key: "customer",
      label: "Customer ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    idParam("The event `id` from List Events or Create Event."),
    ...commonParams(),
  ],
  output: [{ key: "customer", type: "number", label: "Customer ID" }],

  execute(input, ctx) {
    const body = compact({
      customer: input.customer,
    });
    return new TeamUpClient(ctx).request(`/events/${input.id}/leave_waitlist`, {
      method: "POST",
      body,
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
