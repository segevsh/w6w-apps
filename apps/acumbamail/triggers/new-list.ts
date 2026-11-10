import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listGetAll from "../actions/list-get-all.ts";

/**
 * `getLists` returns the account's whole set of subscriber lists as a dictionary indexed by list
 * ID (one request, no paging; https://acumbamail.com/en/apidoc/function/getLists/), so each check
 * diffs the IDs against the previous check (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New Subscriber List",
  description: "The run gets each newly created subscriber list.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "list", type: "object", label: "The list as Acumbamail returns it" },
  ],
  sample: { id: "123456", list: { name: "Newsletter" } },
  async poll({ state }, ctx) {
    const out = await listGetAll.execute({}, ctx) as { result?: unknown };
    const dict = out.result && typeof out.result === "object" && !Array.isArray(out.result)
      ? out.result as Record<string, unknown>
      : {};
    const ids = Object.keys(dict);
    const { events, nextState } = await pollSnapshot({
      state,
      rows: ids.map((id) => ({ key: id, values: { id } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => ({ id: e.key, list: dict[e.key] })), nextState };
  },
};

export default trigger;
