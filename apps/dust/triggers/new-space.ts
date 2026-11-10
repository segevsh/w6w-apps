import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import spaceList from "../actions/space-list.ts";

/**
 * Small bounded collection: `GET /spaces` answers every space the key can see in one unpaginated
 * response (the OpenAPI document defines no paging parameters). `pollSnapshot` throws past 5000.
 */
const trigger: TriggerDefinition = {
  key: "new-space",
  title: "New Space",
  description: "The run gets each space newly created in the Dust workspace.",
  output: [
    { key: "sId", type: "string", label: "Space ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "kind", type: "string", label: "Kind" },
  ],
  sample: { sId: "spc_abc123", name: "Support", kind: "regular" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await spaceList.execute({}, ctx) as { spaces?: Array<{ sId?: unknown }> };
    const spaces = Array.isArray(out?.spaces) ? out.spaces : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: spaces.map((space) => ({ key: String(space.sId ?? ""), values: space })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
