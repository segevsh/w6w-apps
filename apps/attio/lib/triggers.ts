import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * "New <record>" over a bounded collection: diff the ids against the previous check (added
 * only). `idOf` returns the record's own id (Attio nests it, e.g. `id.list_id`).
 */
export async function newRecords(o: {
  state: unknown;
  items: unknown[];
  idOf(item: unknown): unknown;
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const byId = new Map<string, unknown>();
  for (const item of o.items) {
    const id = o.idOf(item);
    if (typeof id !== "string" || id === "") {
      throw new Error("Attio list returned a record without an id");
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
