import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listList from "../actions/list-list.ts";

/**
 * `GET /1/emailmarketing/getlists.json` through `list-list`: the endpoint takes no paging
 * parameters and returns every contact list of the account in one response
 * (https://developers.vbout.com/scripts/openapi.json, `EmailMarketing/GetLists`), so the whole
 * collection is snapshot-diffed (additions only; more than 5000 lists throws).
 */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New Contact List",
  description: "The run gets each email-marketing contact list newly created in Vbout.",
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "148", name: "NYC" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await listList.execute({} as never, ctx) as {
      lists?: { items?: unknown[] };
    };
    const rows = (out.lists?.items ?? []).map((value) => ({
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
