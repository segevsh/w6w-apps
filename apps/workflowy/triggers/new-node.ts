import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import nodeList from "../actions/node-list.ts";

/**
 * `GET /api/v1/nodes?parent_id=<parent>` through `node-list`: the endpoint is unpaginated and
 * returns every child of one parent in a single response, unordered
 * (https://workflowy.com/api-reference/), so the children are snapshot-diffed (additions only;
 * more than 5000 children throws).
 */
const trigger: TriggerDefinition = {
  key: "new-node",
  title: "New Node",
  description: "The run gets each node newly added under a WorkFlowy parent (e.g. the inbox).",
  params: [{
    key: "parent_id",
    label: "Parent",
    type: "string",
    default: "inbox",
    hint: 'Node id, short id, URL, shortcut key, "None" (top level), "inbox", or a calendar key.',
  }],
  output: [
    { key: "id", type: "string", label: "Node ID" },
    { key: "name", type: "string", label: "Text" },
  ],
  sample: { id: "sample-node-id", name: "Buy milk", parent_id: "inbox", completed: false },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const parent = String(params.parent_id ?? "").trim() || "inbox";
    const out = await nodeList.execute({ parent_id: parent }, ctx) as { nodes?: unknown[] };
    const rows = (out.nodes ?? []).map((value) => ({
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
