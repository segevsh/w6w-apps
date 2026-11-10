import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import alertContactList from "../actions/alert-contact-list.ts";

/** UptimeRobot documents `limit` as "Default and max. is 50" and `offset` for paging. */
const PAGE = 50;
const MAX_ROWS = 5000;

/**
 * `POST /v2/getAlertContacts` through `alert-contact-list`, read in full page by page; an account's
 * alert contacts are a short, plan-limited list (https://uptimerobot.com/api/legacy/). No sort
 * order is documented, so the collection is snapshot-diffed (additions only).
 */
const trigger: TriggerDefinition = {
  key: "new-alert-contact",
  title: "New Alert Contact",
  description: "The run gets each alert contact newly added to the UptimeRobot account.",
  output: [
    { key: "id", type: "string", label: "Alert contact ID" },
    { key: "friendly_name", type: "string", label: "Friendly name" },
    { key: "type", type: "number", label: "Type" },
  ],
  sample: { id: "0993765", friendly_name: "On-call email", type: 2, status: 2 },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const rows: Array<{ key: string; values: unknown }> = [];
    for (let offset = 0;; offset += PAGE) {
      if (offset >= MAX_ROWS) {
        throw new Error(`UptimeRobot alert-contact snapshot exceeds ${MAX_ROWS} rows`);
      }
      const out = await alertContactList.execute({ limit: PAGE, offset }, ctx) as {
        alertContacts?: unknown[];
      };
      const page = out.alertContacts ?? [];
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
