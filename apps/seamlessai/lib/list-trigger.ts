import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listList from "../actions/list-list.ts";

interface Row {
  listId: string | number;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * `GET /lists` returns every list the user owns in one unpaged response
 * (https://docs.seamless.ai/api-reference/v2/lists/list-all-lists), so each check diffs the ids
 * against the previous one (`pollSnapshot`).
 */
export function listTrigger(o: {
  key: string;
  title: string;
  description: string;
  updated: boolean;
}): TriggerDefinition {
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    minIntervalMs: 300_000,
    output: [
      { key: "listId", type: "string", label: "List ID" },
      { key: "name", type: "string", label: "Name" },
      { key: "createdAt", type: "string", label: "Created at" },
      { key: "updatedAt", type: "string", label: "Updated at" },
    ],
    sample: {
      listId: "10001",
      name: "Q3 Prospects",
      createdAt: "2026-11-10T09:00:00.000Z",
      updatedAt: "2026-11-10T09:00:00.000Z",
    },
    async poll({ state }, ctx) {
      const res = await listList.execute({}, ctx) as { data?: Row[] };
      const data = Array.isArray(res.data) ? res.data : [];
      const { events, nextState } = await pollSnapshot({
        state,
        rows: data.map((r) => ({ key: String(r.listId), values: r })),
        emit: { added: true, updated: o.updated },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
