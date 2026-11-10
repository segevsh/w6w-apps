import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * Items of a bounded Raindrop listing diffed against the previous check (`pollSnapshot`, added
 * only; the first check seeds and emits nothing). `keyOf` names the vendor's own identity field.
 */
export async function snapshotAdded(
  state: unknown,
  items: unknown[],
  keyOf: (item: Record<string, unknown>) => string,
) {
  const rows = items.map((item) => ({
    key: keyOf(item as Record<string, unknown>),
    values: item,
  }));
  const { events, nextState } = await pollSnapshot({
    state,
    rows,
    emit: { added: true, updated: false, removed: false },
  });
  return { events: events.map((e) => e.values), nextState };
}
