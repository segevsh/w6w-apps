import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, epochMillis } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `POST /interviewSchedule.list` — the interviews that have been booked.
 *
 * A **schedule** is the whole booking for one candidate at one stage — an
 * onsite with four back-to-back sessions is one schedule containing four
 * events. So this is the right level for "who are we interviewing this week"
 * and the wrong level for "when exactly is the system-design round"; that is
 * `interview-event-list`.
 *
 * ## The two questions it answers well
 *
 * Filtering by `applicationId` says whether one candidate has anything booked —
 * the check behind "we said we would schedule and nobody has". Filtering by
 * `interviewStageId` says how loaded a stage is this week, which is the
 * interviewer-capacity question.
 *
 * Times are per-event, so a schedule alone does not tell you *when* anything
 * happens.
 */
const action: ActionDefinition = {
  key: "interview-schedule-list",
  type: "read",
  resource: "interview",
  title: "List interview schedules",
  description:
    "Bookings — one per candidate per stage, so a four-session onsite is ONE schedule. The " +
    "times live on its events.",
  params: [
    {
      key: "applicationId",
      label: "Application ID",
      type: "string",
      default: "",
      hint: "Answers 'has anything actually been booked for this person'.",
    },
    {
      key: "interviewStageId",
      label: "Interview Stage ID",
      type: "string",
      default: "",
      hint: "Answers 'how loaded is this stage', which is the interviewer-capacity question.",
    },
    { key: "createdAfter", label: "Created After", type: "datetime", default: "" },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "schedules", type: "array", label: "Interview schedules" },
    { key: "count", type: "number", label: "Schedules returned" },
    { key: "syncToken", type: "string", label: "Store this and pass it next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new AshbyClient(ctx);
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "interviewSchedule.list",
      compact({
        applicationId: p.applicationId,
        interviewStageId: p.interviewStageId,
        syncToken: p.syncToken,
        createdAfter: epochMillis(p.createdAfter, "createdAfter"),
      }),
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    return { schedules: page.items, count: page.items.length, syncToken: page.syncToken };
  },
};

export default action;
