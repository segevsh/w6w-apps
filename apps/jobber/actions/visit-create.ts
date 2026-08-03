import type { ActionDefinition } from "@w6w/types";
import { compact, csv, JobberClient, unwrap, VISIT_FIELDS } from "../lib/client.ts";

interface Input {
  jobId: string;
  title?: string;
  instructions?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  timezone?: string;
  assignedTo?: string;
  notifyTeam?: boolean;
}

const MUTATION = `
  mutation CreateVisit($jobId: EncodedId!, $input: VisitCreateInput!) {
    visitCreate(jobId: $jobId, input: $input) {
      createdVisits { ${VISIT_FIELDS} }
      job { id jobNumber jobStatus }
      userErrors { message path }
    }
  }
`;

/**
 * Schedule a visit on an existing job.
 *
 * The schedule is **not** an ISO timestamp. Jobber's `LocalDateTimeAttributes`
 * splits it into three parts — `date` (ISO 8601 date, non-null), `time` (ISO
 * 8601 time, optional) and `timezone` (non-null) — and that shape is
 * deliberate: a service appointment is "Tuesday at 9am at the property", a
 * wall-clock fact, not an instant. Collapsing it into a UTC timestamp is how an
 * appointment ends up an hour out across a DST boundary.
 *
 * Two consequences the params encode:
 *
 *   - **Timezone is required whenever a date is given.** There is no default
 *     that is safe to invent here, so a start date without a timezone is
 *     rejected locally with a clear message rather than sent for Jobber to
 *     reject opaquely.
 *   - **Omitting the time makes it an all-day visit**, because `time` is the
 *     optional half. That is a feature, not an accident.
 *
 * Omitting the schedule entirely creates an *unscheduled* visit — a real
 * Jobber concept, a piece of work on the job with no slot yet.
 *
 * The mutation takes a list and can create several visits at once; this action
 * creates one. Batch scheduling goes through `graphql-query`.
 */
const visitCreate: ActionDefinition<Input> = {
  key: "visit-create",
  type: "perform",
  resource: "visit",
  title: "Create Visit",
  description:
    "Schedule a visit on a job. Give a date, time and timezone for a slot; omit the time for an all-day visit, or omit the date entirely for an unscheduled one.",
  idempotent: false,
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string" },
    { key: "instructions", label: "Instructions", type: "text" },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      hint: "ISO 8601 date. Leave blank to create an unscheduled visit.",
      row: "start",
    },
    {
      key: "startTime",
      label: "Start time",
      type: "string",
      placeholder: "09:00",
      hint: "Leave blank for an all-day visit.",
      row: "start",
    },
    { key: "endDate", label: "End date", type: "date", row: "end" },
    { key: "endTime", label: "End time", type: "string", placeholder: "11:00", row: "end" },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      placeholder: "America/Denver",
      hint: "IANA zone. Required by Jobber whenever a date is set — the schedule is wall-clock.",
    },
    {
      key: "assignedTo",
      label: "Assign to user IDs",
      type: "string",
      hint: "Comma-separated EncodedIds.",
    },
    {
      key: "notifyTeam",
      label: "Notify team",
      type: "boolean",
      hint: "Email the assignees about the new visit.",
    },
  ],
  output: [{ key: "createdVisits", type: "array", label: "The created visits" }],

  async execute(input, ctx) {
    if ((input.startDate || input.endDate) && !input.timezone) {
      throw new Error(
        "visit-create needs a timezone when a start or end date is set — Jobber's schedule is wall-clock, not an instant",
      );
    }

    const schedule = compact({
      notifyTeam: input.notifyTeam,
      teamMemberIdsToAssign: csv(input.assignedTo),
      startAt: input.startDate
        ? compact({ date: input.startDate, time: input.startTime, timezone: input.timezone })
        : undefined,
      endAt: input.endDate
        ? compact({ date: input.endDate, time: input.endTime, timezone: input.timezone })
        : undefined,
    });

    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      jobId: input.jobId,
      input: {
        visits: [compact({
          title: input.title,
          instructions: input.instructions,
          schedule: Object.keys(schedule).length ? schedule : undefined,
        })],
      },
    });

    return unwrap(data, "visitCreate");
  },
};

export default visitCreate;
