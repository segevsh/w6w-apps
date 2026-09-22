/**
 * `GET /api/v2/events` — the class schedule.
 *
 * An Event is one occurrence: a class at a venue, at a time, with instructors.
 * This is the list a workflow reads to answer "what is on, and is it full?" —
 * `occupancy_status` is the occupancy-shaped filter here, and `events-get`
 * returns the counts (`attending_count`, `waiting_count`, `is_full`) per row.
 *
 * ## The time filters come in three flavours, and they are not synonyms
 *
 *  - `starts_at_gte`/`starts_at_lte` and `ends_at_gte`/`ends_at_lte` compare
 *    against the event's own timestamps.
 *  - `local_starts_at_gte`/`local_starts_at_lte` compare against the same
 *    instant expressed in the venue's local time, which is what a "classes
 *    before 9am" question actually means when the business has venues in more
 *    than one timezone.
 *  - `start_gte`/`start_lte` are the recurring-friendly aliases TeamUp
 *    documents alongside them.
 *
 * ## Filtering by people and products
 *
 * `venues`, `instructors` and `offering_types` are comma-separated id lists,
 * `category` is one category id, and `ids` hydrates a set the caller already
 * knows — the same pattern the customers list uses. `active_customer` and
 * `applicable_to_recurring_reservation` are booleans, passed straight through
 * as documented.
 *
 * Rows are Event objects and the envelope is returned verbatim.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  status?: string;
  venues?: string;
  instructors?: string;
  offering_types?: string;
  category?: number;
  ids?: string;
  starts_at_gte?: string;
  starts_at_lte?: string;
  ends_at_gte?: string;
  ends_at_lte?: string;
  local_starts_at_gte?: string;
  local_starts_at_lte?: string;
  start_gte?: string;
  start_lte?: string;
  occupancy_status?: string;
  active_customer?: boolean;
  min_allowed_age?: number;
  max_allowed_age?: number;
  registration_timelines?: string;
  applicable_to_recurring_reservation?: boolean;
  sort?: string;
}

const action: ActionDefinition<Input> = {
  key: "events-list",
  type: "search",
  resource: "event",
  title: "List Events",
  description:
    "Read the class schedule, filtered by venue, instructor, offering type, category, time window " +
    "and occupancy (GET /api/v2/events).",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "The event's status, e.g. active or cancelled.",
    },
    { key: "venues", label: "Venue IDs", type: "string", hint: "Comma-separated venue ids." },
    {
      key: "instructors",
      label: "Instructor IDs",
      type: "string",
      hint: "Comma-separated instructor ids.",
    },
    {
      key: "offering_types",
      label: "Offering type IDs",
      type: "string",
      hint: "Comma-separated offering type ids — the class types, e.g. Yoga.",
    },
    { key: "category", label: "Category ID", type: "number", validation: { integer: true } },
    {
      key: "ids",
      label: "Event IDs",
      type: "string",
      hint: "Comma-separated event ids — hydrate a known set rather than searching.",
    },
    {
      key: "starts_at_gte",
      label: "Starts at or after",
      type: "string",
      placeholder: "2026-09-22T06:00:00Z",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "starts_at_lte",
      label: "Starts at or before",
      type: "string",
      placeholder: "2026-09-29T06:00:00Z",
      hint: "ISO 8601 date-time.",
    },
    { key: "ends_at_gte", label: "Ends at or after", type: "string", hint: "ISO 8601 date-time." },
    { key: "ends_at_lte", label: "Ends at or before", type: "string", hint: "ISO 8601 date-time." },
    {
      key: "local_starts_at_gte",
      label: "Starts at or after (venue local time)",
      type: "string",
      hint: "The same comparison in the venue's local time — what a user means by 'before 9am'.",
    },
    {
      key: "local_starts_at_lte",
      label: "Starts at or before (venue local time)",
      type: "string",
      hint: "The same comparison in the venue's local time.",
    },
    {
      key: "start_gte",
      label: "Starts at or after (recurring alias)",
      type: "string",
      hint: "TeamUp's recurring-friendly alias of `starts_at_gte`.",
    },
    {
      key: "start_lte",
      label: "Starts at or before (recurring alias)",
      type: "string",
      hint: "TeamUp's recurring-friendly alias of `starts_at_lte`.",
    },
    {
      key: "occupancy_status",
      label: "Occupancy status",
      type: "string",
      hint: "Filter by how full the event is, as TeamUp spells it.",
    },
    {
      key: "active_customer",
      label: "Active customer",
      type: "boolean",
      hint: "Boolean filter, passed straight through as documented.",
    },
    {
      key: "min_allowed_age",
      label: "Minimum allowed age",
      type: "number",
      hint: "Events whose minimum age is at least this.",
    },
    {
      key: "max_allowed_age",
      label: "Maximum allowed age",
      type: "number",
      hint: "Events whose maximum age is at most this.",
    },
    {
      key: "registration_timelines",
      label: "Registration timelines",
      type: "string",
      hint: "TeamUp's registration-timeline selector.",
    },
    {
      key: "applicable_to_recurring_reservation",
      label: "Applicable to recurring reservation",
      type: "boolean",
    },
    { key: "sort", label: "Sort", type: "string", hint: "The server-side sort order." },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/events", {
      query: {
        ...paginationQuery(input),
        status: input.status,
        venues: input.venues,
        instructors: input.instructors,
        offering_types: input.offering_types,
        category: input.category,
        ids: input.ids,
        starts_at_gte: input.starts_at_gte,
        starts_at_lte: input.starts_at_lte,
        ends_at_gte: input.ends_at_gte,
        ends_at_lte: input.ends_at_lte,
        local_starts_at_gte: input.local_starts_at_gte,
        local_starts_at_lte: input.local_starts_at_lte,
        start_gte: input.start_gte,
        start_lte: input.start_lte,
        occupancy_status: input.occupancy_status,
        active_customer: input.active_customer,
        min_allowed_age: input.min_allowed_age,
        max_allowed_age: input.max_allowed_age,
        registration_timelines: input.registration_timelines,
        applicable_to_recurring_reservation: input.applicable_to_recurring_reservation,
        sort: input.sort,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
