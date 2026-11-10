import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import calendarList from "../actions/calendar-list.ts";
import { categoryParam } from "../lib/params.ts";

const trigger: TriggerDefinition = {
  key: "new-calendar",
  title: "New Calendar",
  description: "The run gets each Zoho Calendar newly available to the connection.",
  params: [{
    ...categoryParam,
    hint: "Which calendars to watch; leave blank for `all` (own, group, app and others).",
  }],
  output: [{ key: "uid", type: "string", label: "Calendar UID" }],
  sample: { uid: "calendar-1", name: "Team" },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    // Without a category Zoho returns only the caller's own calendars, so default to `all`.
    const category = (params as { category?: string }).category || "all";
    const result = await calendarList.execute({ category }, ctx) as {
      calendars?: Array<Record<string, unknown>>;
    };
    const { events, nextState } = await pollSnapshot({
      state,
      maxRows: 5000,
      emit: { added: true, updated: false, removed: false },
      rows: (result.calendars ?? []).map((item) => ({
        key: String(item.uid ?? item.id ?? ""),
        values: item,
      })),
    });
    return { events: events.map((event) => event.values), nextState };
  },
};
export default trigger;
