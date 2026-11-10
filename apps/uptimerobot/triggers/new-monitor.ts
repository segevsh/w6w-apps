import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import monitorList from "../actions/monitor-list.ts";

/** UptimeRobot documents `limit` as "Default and max. is 50" and `offset` for paging. */
const PAGE = 50;
const MAX_ROWS = 5000;

/**
 * `POST /v2/getMonitors` through `monitor-list`, read in full page by page (the account's monitor
 * count is capped by its plan, https://uptimerobot.com/api/legacy/). The vendor documents no sort
 * order, so the collection is snapshot-diffed (additions only) rather than read as a feed.
 */
const trigger: TriggerDefinition = {
  key: "new-monitor",
  title: "New Monitor",
  description: "The run gets each monitor newly added to the UptimeRobot account.",
  output: [
    { key: "id", type: "number", label: "Monitor ID" },
    { key: "friendly_name", type: "string", label: "Friendly name" },
    { key: "url", type: "string", label: "URL" },
  ],
  sample: { id: 777749809, friendly_name: "Example site", url: "monitored-site" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const rows: Array<{ key: string; values: unknown }> = [];
    for (let offset = 0;; offset += PAGE) {
      if (offset >= MAX_ROWS) {
        throw new Error(`UptimeRobot monitor snapshot exceeds ${MAX_ROWS} rows`);
      }
      const out = await monitorList.execute({ limit: PAGE, offset }, ctx) as {
        monitors?: unknown[];
      };
      const page = out.monitors ?? [];
      for (const value of page) {
        rows.push({ key: String((value as { id?: unknown }).id), values: value });
      }
      if (page.length < PAGE) break;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
      maxRows: MAX_ROWS,
    });
    return { events: events.map((event) => event.values), nextState };
  },
};

export default trigger;
