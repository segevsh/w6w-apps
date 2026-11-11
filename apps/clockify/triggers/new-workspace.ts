import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import workspaceList from "../actions/workspace-list.ts";

interface Workspace {
  id: string;
  name?: string;
}

/**
 * `GET /workspaces` returns every workspace the key can see in one unpaged response — a handful per
 * user, unordered and with no timestamps (https://docs.clockify.me/ "Get all my workspaces",
 * 2026-11-10). Each check diffs the ids against the previous one (`pollSnapshot`, added only).
 */
const newWorkspace: TriggerDefinition = {
  key: "new-workspace",
  title: "New Workspace",
  description:
    "The run gets each workspace the connected Clockify user newly belongs to (created or joined).",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "64a687e29ae1f428e7ebe303", name: "Acme Studio" },
  async poll({ state }, ctx) {
    const action = workspaceList as unknown as ActionDefinition;
    const result = await action.execute({}, ctx) as { items?: Workspace[] };
    const byId = new Map<string, Workspace>();
    for (const w of Array.isArray(result?.items) ? result.items : []) {
      if (typeof w?.id !== "string" || w.id === "") {
        throw new Error("Clockify list workspaces returned a workspace without id");
      }
      byId.set(w.id, w);
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};

export default newWorkspace;
