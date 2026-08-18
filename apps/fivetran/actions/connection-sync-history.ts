import type { ActionDefinition } from "@w6w/types";
import { FivetranClient, isoTimestamp, query } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/connections/{id}/sync-history` — what has actually been running.
 *
 * The record behind `connection-get`'s single status. It answers the questions
 * a status cannot: how long syncs take, whether they are getting slower, and
 * how often one fails and the next succeeds — which is the pattern that hides a
 * flaky source behind a green dashboard.
 *
 * ## The window is seven days, and that is a hard limit
 *
 * Fivetran keeps this endpoint to a **maximum seven-day range**. Asking for a
 * month does not return a month. So this is a monitoring endpoint rather than
 * an archive: a workflow that wants trend data over quarters has to collect it
 * as it goes, which is worth knowing before building a report that appears to
 * work and silently truncates.
 *
 * Omitting the range gives Fivetran's default window rather than everything.
 */
const action: ActionDefinition = {
  key: "connection-sync-history",
  type: "read",
  resource: "connection",
  title: "Get a connection's sync history",
  description:
    "Recent sync runs, with durations and outcomes — where a flaky source hiding behind a green " +
    "dashboard shows up. Fivetran caps the window at SEVEN DAYS.",
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
    {
      key: "startTime",
      label: "From",
      type: "datetime",
      default: "",
      hint: "At most seven days before the end. A longer range does not return more.",
    },
    { key: "endTime", label: "To", type: "datetime", default: "" },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "history", type: "array", label: "Sync runs, newest first" },
    { key: "count", type: "number", label: "Runs returned" },
    { key: "failedCount", type: "number", label: "Of those, how many did not succeed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = String(p.connectionId ?? "").trim();
    if (!connectionId) throw new Error("`connectionId` is required");

    const start = isoTimestamp(p.startTime, "startTime");
    const end = isoTimestamp(p.endTime, "endTime");
    if (start && end && Date.parse(end) - Date.parse(start) > 7 * 86_400_000) {
      throw new Error(
        "Fivetran caps sync history at a seven-day window — narrow the range rather than " +
          "receiving a silently truncated one",
      );
    }

    const client = new FivetranClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll<{ status?: string }>(
      `/v1/connections/${encodeURIComponent(connectionId)}/sync-history`,
      { query: query({ start_time: start, end_time: end }) },
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );

    const failedCount =
      page.items.filter((r) => String(r?.status ?? "").toUpperCase() !== "SUCCESSFUL").length;

    return { history: page.items, count: page.items.length, failedCount };
  },
};

export default action;
