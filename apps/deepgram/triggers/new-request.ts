import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import requestList from "../actions/request-list.ts";

export const clock = { now: (): number => Date.now() };

const DAY_MS = 86_400_000;
const PAGE_LIMIT = 1000;
const MAX_PAGES = 5;
const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * Wraps `request-list` (`GET /v1/projects/{id}/requests`). Deepgram filters that log by DATE, not
 * time (the action truncates to `YYYY-MM-DD`) and documents no result order, so the trigger always
 * reads yesterday AND today (UTC) in one window, so a poll just after midnight still sees what was
 * logged late on the old day, at the action's maximum page size of 1000, follows `page`, and
 * snapshots the ids. A full final page after 5 pages (5000 or more requests across both days) throws
 * instead of silently dropping requests.
 */
const trigger: TriggerDefinition = {
  key: "new-request",
  title: "New Request",
  description: "The run gets each newly recorded Deepgram API request.",
  params: [],
  output: [{ key: "request_id", type: "string", label: "Request ID" }],
  sample: { request_id: "req_123" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const now = clock.now();
    const start = day(now - DAY_MS);
    const end = day(now);
    const rows: Array<Record<string, unknown>> = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await (requestList as ActionDefinition).execute({
        start,
        end,
        limit: PAGE_LIMIT,
        page,
      }, ctx) as { requests?: Array<Record<string, unknown>> };
      const batch = response.requests ?? [];
      rows.push(...batch);
      if (batch.length < PAGE_LIMIT) break;
      if (page === MAX_PAGES - 1) {
        throw new Error(
          `Deepgram request log for ${start}..${end} holds more than ${PAGE_LIMIT * MAX_PAGES} ` +
            "requests; refusing to poll it",
        );
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: rows.map((item) => ({
        key: String(item.request_id ?? item.id ?? ""),
        values: item,
      })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
