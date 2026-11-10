import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listGetAll from "../actions/list-get-all.ts";

/**
 * `GET /v3/marketing/lists` through `list-get-all` (`returnAll`: follows `_metadata.next`, 1000
 * lists per page max — https://www.twilio.com/docs/sendgrid/api-reference/lists/get-all-lists).
 * The index is small and bounded (a snapshot above 5000 rows throws); additions only.
 */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New List",
  description: "The run gets each newly created Marketing Campaigns list.",
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "sample-list-id", name: "Newsletter", contact_count: 0 },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await listGetAll.execute({ returnAll: true, limit: 100 }, ctx);
    const rows = (Array.isArray(out) ? out : []).map((value) => ({
      key: String((value as { id?: unknown }).id ?? ""),
      values: value,
    }));
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
    return { events: events.map((event) => event.values), nextState };
  },
};

export default trigger;
