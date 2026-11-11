import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * "New <record>" over a small bounded collection (brief §9.1 c): `GET /teams` and `GET /hubs` return
 * every row of the organization in one array (no paging — an organization has a handful of each),
 * so a check reads the whole array through the app's OWN list action and diffs the ids.
 */
export async function newRecords(o: {
  state: unknown;
  action: ActionDefinition;
  field: "teams" | "hubs";
  ctx: HookContext;
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const res = await o.action.execute({}, o.ctx) as Record<string, unknown>;
  const items = Array.isArray(res[o.field]) ? res[o.field] as unknown[] : [];
  const byId = new Map<string, unknown>();
  for (const item of items) {
    const id = (item as { id?: unknown })?.id;
    if (typeof id !== "string" || id === "") {
      throw new Error("Onfleet list returned a record without an id");
    }
    byId.set(id, item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}
