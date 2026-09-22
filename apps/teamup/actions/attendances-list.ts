/**
 * `GET /api/v2/attendances` — who is registered for what.
 *
 * An Attendance is the record that connects one customer to one event, and
 * this list answers the questions that would otherwise take two round trips:
 * "who is booked into tonight's class" (`event`), "what has this customer
 * booked" (`customer`), and — through the `event_*` filters — "who attended
 * classes in this window" without listing the events first.
 *
 * `event_starts_at_*` and `event_local_starts_at_*` are the same two flavours
 * `events-list` documents: the absolute instant, and the venue's local
 * wall-clock time. `offering_types` narrows to class types (comma-separated
 * ids), `venue` to one location, and `status` uses the attendance's own status
 * vocabulary — see `attendances-get`.
 *
 * Rows are Attendance objects and the envelope is returned verbatim.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  customer?: number;
  event?: number;
  venue?: number;
  status?: string;
  offering_types?: string;
  sort?: string;
  event_starts_at_gte?: string;
  event_starts_at_lte?: string;
  event_local_starts_at_gte?: string;
  event_local_starts_at_lte?: string;
  event_applicable_to_recurring_reservation?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "attendances-list",
  type: "search",
  resource: "attendance",
  title: "List Attendances",
  description:
    "List the bookings connecting customers to events, filtered by customer, event, venue, status " +
    "and event time (GET /api/v2/attendances).",
  params: [
    {
      key: "customer",
      label: "Customer ID",
      type: "number",
      validation: { integer: true },
      hint: "One customer's bookings.",
    },
    {
      key: "event",
      label: "Event ID",
      type: "number",
      validation: { integer: true },
      hint: "One event's bookings.",
    },
    { key: "venue", label: "Venue ID", type: "number", validation: { integer: true } },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "The attendance's status, as TeamUp spells it.",
    },
    {
      key: "offering_types",
      label: "Offering type IDs",
      type: "string",
      hint: "Comma-separated offering type ids.",
    },
    { key: "sort", label: "Sort", type: "string", hint: "The server-side sort order." },
    {
      key: "event_starts_at_gte",
      label: "Event starts at or after",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "event_starts_at_lte",
      label: "Event starts at or before",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "event_local_starts_at_gte",
      label: "Event starts at or after (venue local time)",
      type: "string",
      hint: "The same comparison in the venue's local time.",
    },
    {
      key: "event_local_starts_at_lte",
      label: "Event starts at or before (venue local time)",
      type: "string",
      hint: "The same comparison in the venue's local time.",
    },
    {
      key: "event_applicable_to_recurring_reservation",
      label: "Event applicable to recurring reservation",
      type: "boolean",
    },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/attendances", {
      query: {
        ...paginationQuery(input),
        customer: input.customer,
        event: input.event,
        venue: input.venue,
        status: input.status,
        offering_types: input.offering_types,
        sort: input.sort,
        event_starts_at_gte: input.event_starts_at_gte,
        event_starts_at_lte: input.event_starts_at_lte,
        event_local_starts_at_gte: input.event_local_starts_at_gte,
        event_local_starts_at_lte: input.event_local_starts_at_lte,
        event_applicable_to_recurring_reservation: input.event_applicable_to_recurring_reservation,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
