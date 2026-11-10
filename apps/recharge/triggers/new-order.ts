import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/order-list.ts";

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
  /** Next page request while a window larger than MAX_PAGES pages is being drained. */
  resume?: Record<string, unknown>;
}

const items = (result: unknown): unknown[] => (result as { items?: unknown[] }).items ?? [];
const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");
const first = (sinceMs: number): Record<string, unknown> => ({
  createdAtMin: new Date(sinceMs).toISOString(),
  limit: 100,
});
const next = (
  _input: Record<string, unknown>,
  result: unknown,
): Record<string, unknown> | undefined =>
  (result as { nextCursor?: string }).nextCursor
    ? { limit: 100, cursor: (result as { nextCursor: string }).nextCursor }
    : undefined;

const trigger: TriggerDefinition = {
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created order.",
  output: [{ key: "id", type: "number", label: "Order ID" }, {
    key: "updated_at",
    type: "string",
    label: "Updated at",
  }],
  sample: { id: 1, created_at: "2026-11-09T10:00:00Z", updated_at: "2026-11-09T10:00:00Z" },
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
    let input: Record<string, unknown> | undefined = s.resume ?? first(s.cursor - OVERLAP_MS);
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
    // A window larger than MAX_PAGES pages is not fully read: hold the cursor and store the next
    // page request, so the following check resumes there (not at page 1) until the window is read.
    const nextState: State = {
      v: 1,
      kind: "ids",
      seeded: true,
      ids: [...seen].slice(-SEEN_WINDOW),
      cursor: truncated ? s.cursor : now,
      ...(truncated && input ? { resume: input } : {}),
    };
    return { events, nextState };
  },
};

export default trigger;
