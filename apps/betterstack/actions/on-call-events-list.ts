import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /api/v2/on-calls/{schedule_id}/events` (Better Stack Uptime API v2).
 */
type Input = {
  schedule_id: string;
  starts_at?: string;
  ends_at?: string;
};

const onCallEventsList: ActionDefinition<Input> = {
  key: "on-call-events-list",
  type: "read",
  resource: "on-call",
  title: "List On-call Events",
  description: "The shifts of one on-call calendar within an optional time window.",
  params: [
    str("schedule_id", "Calendar ID", {
      required: true,
      hint: "The on-call calendar's ID (from List On-call Calendars).",
    }),
    str("starts_at", "Starts at", { hint: "Window start, ISO 8601." }),
    str("ends_at", "Ends at", { hint: "Window end, ISO 8601." }),
  ],
  output: [
    { key: "events", type: "array", label: "Shifts: {id, users[], starts_at, ends_at, override}" },
    { key: "count", type: "number", label: "Number of shifts" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", `${V2}/on-calls/${encodeId(input.schedule_id)}/events`, {
      query: { starts_at: input.starts_at, ends_at: input.ends_at },
    }) as { events?: unknown[] };
    const events = body.events ?? [];
    return { events, count: events.length };
  },
};

export default onCallEventsList;
