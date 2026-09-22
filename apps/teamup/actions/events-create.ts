/**
 * `POST /api/v2/events` — put a class on the schedule.
 *
 * Six fields are required, and they are the ones a schedule cannot be inferred
 * from: `starts_at`, `ends_at`, `name`, `venue`, `offering_type` and
 * `instructors`. Everything else is optional.
 *
 *  - **`instructors` is a JSON array of ids.** It is collected here as a
 *    comma-separated list and sent as a real array (`intList` in
 *    `lib/client.ts`) — a string where TeamUp expects an array is a
 *    `parameter_invalid` refusal, not a silent no-op.
 *  - `registration_timelines` is documented as an array without an element
 *    schema, so it is exposed as JSON and passed through untouched.
 *  - `max_occupancy` is the capacity the attendance and waitlist actions fill;
 *    without it the event takes TeamUp's own default.
 *  - `external_id` is the caller's own identifier for the event.
 *
 * The `201` body is the created Event — the same shape `events-get` returns —
 * and its `id` is what `events-register`, `events-join-waitlist` and
 * `attendances-list` take.
 */
import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, intList, TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery } from "../lib/params.ts";
import { eventOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  starts_at: string;
  ends_at: string;
  name: string;
  venue: number;
  offering_type: number;
  instructors: string;
  category?: number;
  max_occupancy?: number;
  description?: string;
  registration_timelines?: unknown;
  calendar_opens_at?: string;
  external_id?: string;
}

const action: ActionDefinition<Input> = {
  key: "events-create",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description:
    "Put a class on the schedule: times, name, venue, offering type and instructors, with optional " +
    "capacity and registration settings (POST /api/v2/events).",
  idempotent: false,
  params: [
    {
      key: "starts_at",
      label: "Starts at",
      type: "string",
      required: true,
      placeholder: "2026-09-22T06:00:00Z",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "ends_at",
      label: "Ends at",
      type: "string",
      required: true,
      placeholder: "2026-09-22T07:00:00Z",
      hint: "ISO 8601 date-time.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "venue",
      label: "Venue ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "See List Venues for the ids.",
    },
    {
      key: "offering_type",
      label: "Offering type ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The class type, e.g. Yoga — see List Offering Types.",
    },
    {
      key: "instructors",
      label: "Instructor IDs",
      type: "string",
      required: true,
      hint: "Comma-separated instructor ids. Sent as a JSON array.",
    },
    { key: "category", label: "Category ID", type: "number", validation: { integer: true } },
    {
      key: "max_occupancy",
      label: "Maximum occupancy",
      type: "number",
      validation: { integer: true },
      hint: "Capacity in people; the waitlist and attendance numbers are measured against it.",
    },
    { key: "description", label: "Description", type: "string" },
    {
      key: "registration_timelines",
      label: "Registration timelines",
      type: "json",
      hint: "TeamUp's array of registration timelines. Passed through unchanged.",
    },
    {
      key: "calendar_opens_at",
      label: "Calendar opens at",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "external_id",
      label: "External ID",
      type: "string",
      hint: "The caller's own identifier for this event.",
    },
    ...commonParams(),
  ],
  output: eventOutput,

  execute(input, ctx) {
    const body = compact({
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      name: input.name,
      venue: input.venue,
      offering_type: input.offering_type,
      instructors: intList(input.instructors),
      category: input.category,
      max_occupancy: input.max_occupancy,
      description: input.description,
      registration_timelines: asOptionalJson<unknown[]>(
        input.registration_timelines,
        "`registration_timelines`",
      ),
      calendar_opens_at: input.calendar_opens_at,
      external_id: input.external_id,
    });
    return new TeamUpClient(ctx).request("/events", {
      method: "POST",
      body,
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
