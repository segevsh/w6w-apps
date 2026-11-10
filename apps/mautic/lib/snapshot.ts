import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * "New <record>" over a small collection (brief §9.1 c): the whole list is read through the app's
 * OWN list action with `returnAll` (it pages `start`/`limit` ≤ 100, `GET /segments`, `/campaigns`,
 * `/emails`, `/tags`) and the ids are diffed against the previous check (added only). The snapshot
 * kit refuses more than 5000 rows with an error naming the cap.
 */
export async function newRecords(o: {
  state: unknown;
  action: ActionDefinition;
  ctx: HookContext;
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const items = await o.action.execute({ returnAll: true }, o.ctx);
  if (!Array.isArray(items)) throw new Error("Mautic list did not return an array");
  const byId = new Map<string, unknown>();
  for (const item of items) {
    const id = (item as { id?: unknown })?.id;
    if (typeof id !== "string" && typeof id !== "number") {
      throw new Error("Mautic list returned a record without an id");
    }
    byId.set(String(id), item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}
