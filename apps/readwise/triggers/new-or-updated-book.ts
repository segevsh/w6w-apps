import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/book-list.ts";

/** Seconds-level look-back before the previous check, so a record that lands late is still seen. */
const OVERLAP_MS = 120_000;
const MAX_PAGES = 3;
/** Above MAX_PAGES x page size, so an overlap re-list never evicts an id emitted last check. */
const SEEN_WINDOW = 1_000;

interface State {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  /** Epoch ms of the last complete check. */
  cursor: number;
}

const items = (result: unknown): unknown[] => (result as { results?: unknown[] }).results ?? [];
const idOf = (item: unknown): string =>
  `${(item as { id?: unknown }).id}:${(item as { updated?: unknown }).updated}`;
const first = (sinceMs: number): Record<string, unknown> => ({
  updated__gt: new Date(sinceMs).toISOString(),
  page_size: 100,
  page: 1,
});
const next = (
  input: Record<string, unknown>,
  result: unknown,
): Record<string, unknown> | undefined =>
  (result as { next?: string | null }).next
    ? { ...input, page: Number(input.page) + 1 }
    : undefined;

const trigger: TriggerDefinition = {
  key: "new-or-updated-book",
  title: "New or Updated Book",
  description:
    "The run gets each book, article, tweet or podcast that is new or was updated (e.g. new highlights) since the last check.",
  output: [{ key: "id", type: "number", label: "Book ID" }, {
    key: "title",
    type: "string",
    label: "Title",
  }, { key: "updated", type: "string", label: "Updated at" }],
  sample: { id: 1, title: "Book", updated: "2026-11-09T10:00:00Z" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const now = Date.now();
    const s = state as Partial<State> | undefined;
    if (
      !(s && s.v === 1 && s.kind === "ids" && s.seeded === true && Array.isArray(s.ids) &&
        typeof s.cursor === "number")
    ) {
      const seed: State = { v: 1, kind: "ids", seeded: true, ids: [], cursor: now };
      return { events: [], nextState: seed };
    }
    const seen = new Set(s.ids);
    const events: unknown[] = [];
    let input: Record<string, unknown> | undefined = first(s.cursor - OVERLAP_MS);
    let truncated = false;
    for (let page = 0; input; page++) {
      if (page === MAX_PAGES) {
        truncated = true;
        break;
      }
      const result = await action.execute(input, ctx);
      for (const item of items(result)) {
        const id = idOf(item);
        if (id && !seen.has(id)) {
          seen.add(id);
          events.push(item);
        }
      }
      input = next(input, result);
    }
    // A window larger than MAX_PAGES pages is not fully read: hold the cursor so the rest is
    // fetched next check instead of being skipped.
    const nextState: State = {
      v: 1,
      kind: "ids",
      seeded: true,
      ids: [...seen].slice(-SEEN_WINDOW),
      cursor: truncated ? s.cursor : now,
    };
    return { events, nextState };
  },
};

export default trigger;
