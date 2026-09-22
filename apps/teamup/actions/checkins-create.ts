/**
 * `POST /api/v2/checkins` — record a front-desk visit.
 *
 * A check-in is the gym door, not the class list: it says a customer came in,
 * and it is **independent of class registration**. Registering for an event
 * makes an attendance; walking in makes a check-in. A workflow that needs both
 * has to do both, and a "did they show up" report that only reads attendances
 * will miss every visit that was not a class.
 *
 * `date`, `venue` and `customer` are required. `customer_membership` names the
 * membership the visit is charged against when the customer holds more than
 * one, and `comped` records the visit as not charged at all — the same pair of
 * controls event registration has.
 *
 * The `201` body returns `id`, `timestamp`, `comped` and the
 * `customer_membership` it was recorded against: a confirmation, not a full
 * check-in record. Two calls record two visits, which is why this action is
 * not idempotent.
 */
import type { ActionDefinition } from "@w6w/types";
import { compact, TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery } from "../lib/params.ts";
import { checkinOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  date: string;
  venue: number;
  customer: number;
  customer_membership?: number;
  comped?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "checkins-create",
  type: "perform",
  resource: "checkin",
  title: "Create Check-in",
  description:
    "Record a front-desk visit for a customer at a venue, against a membership or comped (POST " +
    "/api/v2/checkins).",
  idempotent: false,
  params: [
    {
      key: "date",
      label: "Date",
      type: "string",
      required: true,
      hint: "The date, or date-time, of the visit as TeamUp records it.",
    },
    {
      key: "venue",
      label: "Venue ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "Where the visit happened — see List Venues.",
    },
    {
      key: "customer",
      label: "Customer ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "customer_membership",
      label: "Charged membership ID",
      type: "number",
      validation: { integer: true },
      hint: "Which of the customer's memberships the visit is charged against.",
    },
    {
      key: "comped",
      label: "Comped",
      type: "boolean",
      hint: "Record the visit without charging a membership.",
    },
    ...commonParams(),
  ],
  output: checkinOutput,

  execute(input, ctx) {
    const body = compact({
      date: input.date,
      venue: input.venue,
      customer: input.customer,
      customer_membership: input.customer_membership,
      comped: input.comped,
    });
    return new TeamUpClient(ctx).request("/checkins", {
      method: "POST",
      body,
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
