/**
 * `POST /api/v2/events/{id}/join_waitlist` — queue a customer for a full event.
 *
 * The response is a waitlist **spot**, and its `status` is the part worth
 * reading: `on_waitlist` is the queue, `spot_reserved` means the event found
 * room and the customer holds it until `reserved_spot_expires_at`, `expired`
 * is a reserved spot that was not taken in time, and `rejected` is TeamUp
 * refusing the entry. `position` is the place in the queue while the spot is
 * `on_waitlist`.
 *
 * A workflow that wants to tell a member a place has opened up should
 * therefore watch the **spot's status**, not simply whether the join
 * succeeded.
 */
import type { ActionDefinition } from "@w6w/types";
import { compact, TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";
import { waitlistSpotOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  id: number;
  customer: number;
}

const action: ActionDefinition<Input> = {
  key: "events-join-waitlist",
  type: "perform",
  resource: "event",
  title: "Join Event Waitlist",
  description:
    "Queue a customer for a full event and return the waitlist spot TeamUp creates (POST " +
    "/api/v2/events/{id}/join_waitlist).",
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
  output: waitlistSpotOutput,

  execute(input, ctx) {
    const body = compact({
      customer: input.customer,
    });
    return new TeamUpClient(ctx).request(`/events/${input.id}/join_waitlist`, {
      method: "POST",
      body,
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
