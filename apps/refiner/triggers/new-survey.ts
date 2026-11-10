import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/form-list.ts";

/** `GET /forms` is ordered by name and an account holds a small set of surveys (page_length up to 1000, one page), so the set is diffed. */
const trigger: TriggerDefinition = {
  key: "new-survey",
  title: "New Survey",
  description: "The run gets each survey created since the last check.",
  output: [{ key: "uuid", type: "string", label: "Survey ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }],
  sample: { uuid: "4f5637d0-3d0d-11ea-b965-614418dec30c", name: "My first survey" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await action.execute({ list: "all", page: 1, pageLength: 1000 }, ctx) as unknown;
    if (((result as { pagination?: { last_page?: number } }).pagination?.last_page ?? 1) > 1) {
      throw new Error("New Survey: more than 1000 surveys; the snapshot cap is one page of 1000");
    }
    const rows = ((result as { items?: unknown[] }).items ?? []).map((item) => ({
      key: String((item as { uuid: string }).uuid),
      values: item,
    }));
    // Added only: an edited or removed record is not a "new" record, so it never fires.
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
