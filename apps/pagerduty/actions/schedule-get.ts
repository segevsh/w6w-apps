import type { ActionDefinition } from "@w6w/types";
import { PagerDutyClient } from "../lib/client.ts";

/** `GET /schedules/{id}` */
const action: ActionDefinition = {
  key: "schedule-get",
  type: "read",
  resource: "schedule",
  title: "Get an on-call schedule",
  description: "Get a single on-call schedule by ID, including its rendered entries.",
  params: [
    { key: "scheduleId", label: "Schedule ID", type: "string", required: true, default: "" },
    {
      key: "since",
      label: "Since",
      type: "datetime",
      default: "",
      hint: "Start of the date range to render entries for (defaults to 2 weeks before now)",
    },
    { key: "until", label: "Until", type: "datetime", default: "" },
  ],

  async execute(input, ctx) {
    const p = input as { scheduleId?: string; since?: string; until?: string };
    const scheduleId = String(p.scheduleId ?? "").trim();
    if (!scheduleId) throw new Error("`scheduleId` is required");

    const client = new PagerDutyClient(ctx);
    const res = await client.request<{ schedule: unknown }>(
      `/schedules/${encodeURIComponent(scheduleId)}`,
      { query: { since: p.since || undefined, until: p.until || undefined } },
    );
    return res.schedule;
  },
};

export default action;
