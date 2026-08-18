import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, csv, epochMillis } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `POST /interviewEvent.list` — the individual sessions inside one schedule.
 *
 * This is where the times, the interviewers and the meeting links live. An
 * onsite booked as one schedule appears here as four events, each with its own
 * start, end and panel — which is what a reminder, a prep-pack or an
 * interviewer-load report actually needs.
 *
 * It requires an `interviewScheduleId`, so the shape of a workflow is always
 * `interview-schedule-list` first, then this per schedule. That is deliberate
 * on Ashby's part: there is no way to ask for "every event this week" across
 * the organisation in one call.
 *
 * An event carries the interviewers' identities and often a video link; nothing
 * from the response is logged.
 */
const action: ActionDefinition = {
  key: "interview-event-list",
  type: "read",
  resource: "interview",
  title: "List interview events",
  description:
    "The sessions inside one schedule, with their times, panels and links. There is no way to " +
    "ask for every event this week — list schedules first, then this per schedule.",
  params: [
    {
      key: "interviewScheduleId",
      label: "Interview Schedule ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `interview-schedule-list`.",
    },
    { key: "createdAfter", label: "Created After", type: "datetime", default: "" },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      default: "",
      advanced: true,
      hint: "Related objects to include inline.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "events", type: "array", label: "Interview events" },
    { key: "count", type: "number", label: "Events returned" },
    { key: "syncToken", type: "string", label: "Store this and pass it next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const interviewScheduleId = String(p.interviewScheduleId ?? "").trim();
    if (!interviewScheduleId) throw new Error("`interviewScheduleId` is required");

    const client = new AshbyClient(ctx);
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "interviewEvent.list",
      compact({
        interviewScheduleId,
        syncToken: p.syncToken,
        createdAfter: epochMillis(p.createdAfter, "createdAfter"),
        expand: csv(p.expand),
      }),
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    return { events: page.items, count: page.items.length, syncToken: page.syncToken };
  },
};

export default action;
