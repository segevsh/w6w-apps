import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * "Added only" diff of a bounded configuration-API list: each check compares the keys it sees
 * against the previous check (`pollSnapshot`) and emits the full record of every new key. State
 * holds only key hashes. The first check (unseeded state) records the keys and emits nothing.
 */
export async function newRecords(
  state: unknown,
  items: unknown[],
  keyOf: (item: unknown) => string,
): Promise<{ events: unknown[]; nextState: unknown }> {
  const byKey = new Map(items.map((i) => [keyOf(i), i]));
  const { events, nextState } = await pollSnapshot({
    state,
    rows: [...byKey.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byKey.get(e.key)), nextState };
}
