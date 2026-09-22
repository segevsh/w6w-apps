/**
 * `GET /api/v2/course_sessions` — the occurrences inside courses.
 *
 * A session is dated and has instructors, a venue and occupancy like an event,
 * which is why this operation documents the same filter set `events-list` does
 * — both time flavours (`starts_at_*` for the absolute instant,
 * `local_starts_at_*` for the venue's local wall clock) and the recurring
 * aliases `start_gte`/`start_lte`.
 *
 * `course` is the filter that makes this list useful on its own: given a course
 * from `courses-list`, it returns that programme's sessions.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  course?: number;
  venues?: string;
  instructors?: string;
  offering_types?: string;
  occupancy_status?: string;
  sort?: string;
  status?: string;
  starts_at_gte?: string;
  starts_at_lte?: string;
  ends_at_gte?: string;
  ends_at_lte?: string;
  local_starts_at_gte?: string;
  local_starts_at_lte?: string;
  start_gte?: string;
  start_lte?: string;
}

const action: ActionDefinition<Input> = {
  key: "course-sessions-list",
  type: "search",
  resource: "course-session",
  title: "List Course Sessions",
  description:
    "List the dated occurrences inside courses, filtered by course, venue, instructor and time (GET " +
    "/api/v2/course_sessions).",
  params: [
    {
      key: "course",
      label: "Course ID",
      type: "number",
      validation: { integer: true },
      hint: "One course's sessions — see List Courses.",
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
      hint: "Comma-separated offering type ids.",
    },
    {
      key: "occupancy_status",
      label: "Occupancy status",
      type: "string",
      hint: "Filter by how full the session is, as TeamUp spells it.",
    },
    { key: "sort", label: "Sort", type: "string", hint: "The server-side sort order." },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "The session's status, as TeamUp spells it.",
    },
    {
      key: "starts_at_gte",
      label: "Starts at or after",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "starts_at_lte",
      label: "Starts at or before",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    { key: "ends_at_gte", label: "Ends at or after", type: "string", hint: "ISO 8601 date-time." },
    { key: "ends_at_lte", label: "Ends at or before", type: "string", hint: "ISO 8601 date-time." },
    {
      key: "local_starts_at_gte",
      label: "Starts at or after (venue local time)",
      type: "string",
      hint: "The same comparison in the venue's local time.",
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
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/course_sessions", {
      query: {
        ...paginationQuery(input),
        course: input.course,
        venues: input.venues,
        instructors: input.instructors,
        offering_types: input.offering_types,
        occupancy_status: input.occupancy_status,
        sort: input.sort,
        status: input.status,
        starts_at_gte: input.starts_at_gte,
        starts_at_lte: input.starts_at_lte,
        ends_at_gte: input.ends_at_gte,
        ends_at_lte: input.ends_at_lte,
        local_starts_at_gte: input.local_starts_at_gte,
        local_starts_at_lte: input.local_starts_at_lte,
        start_gte: input.start_gte,
        start_lte: input.start_lte,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
