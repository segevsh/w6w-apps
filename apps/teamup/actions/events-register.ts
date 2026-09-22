/**
 * `POST /api/v2/events/{id}/register` — put a customer on an event.
 *
 * `customer` is required. `customer_membership` names which of the customer's
 * memberships pays for the spot when they hold more than one — omit it and
 * TeamUp chooses, which is the right default for a customer with a single
 * plan. `comped` registers the spot without charging a membership at all, so
 * it is not the same thing as leaving `customer_membership` empty.
 *
 * The response is deliberately thin: `{"attendance": <id>}`. That id is the
 * handle `attendances-get` takes, and it is the only way to read back what the
 * registration produced.
 *
 * Retrying this is safe: a customer holds at most one attendance per event, so
 * a repeat call resolves to the same registration rather than creating a
 * second one.
 */
import type { ActionDefinition } from "@w6w/types";
import { compact, TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";

interface Input extends CommonInput {
  id: number;
  customer: number;
  customer_membership?: number;
  comped?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "events-register",
  type: "perform",
  resource: "event",
  title: "Register for Event",
  description:
    "Register a customer for one event, optionally against a specific membership or comped (POST " +
    "/api/v2/events/{id}/register).",
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
      key: "customer_membership",
      label: "Paying membership ID",
      type: "number",
      validation: { integer: true },
      hint: "Which of the customer's memberships pays. Omit and TeamUp chooses.",
    },
    {
      key: "comped",
      label: "Comped",
      type: "boolean",
      hint: "Register the spot without charging a membership.",
    },
    idParam("The event `id` from List Events or Create Event."),
    ...commonParams(),
  ],
  output: [{ key: "attendance", type: "number", label: "Attendance ID" }],

  execute(input, ctx) {
    const body = compact({
      customer: input.customer,
      customer_membership: input.customer_membership,
      comped: input.comped,
    });
    return new TeamUpClient(ctx).request(`/events/${input.id}/register`, {
      method: "POST",
      body,
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
