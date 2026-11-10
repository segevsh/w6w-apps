import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import orderList from "../actions/order-list.ts";

/** Re-read this much before the saved cursor, so clock skew and in-flight rows are not lost. */
const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;

interface Resume {
  since: string;
  offset: string;
  startedAt: string;
}
interface State {
  cursor?: string;
  resume?: Resume;
}
export const clock = { now: (): number => Date.now() };

const isoAt = (ms: number) => new Date(ms).toISOString();

async function check(state: unknown, ctx: HookContext) {
  const s = (state ?? {}) as State;
  const nowMs = clock.now();
  const seeded = typeof s.cursor === "string";
  const resume = seeded && s.resume && typeof s.resume.since === "string" ? s.resume : undefined;
  const since = resume?.since ??
    isoAt((seeded ? Date.parse(s.cursor!) : nowMs) - OVERLAP_MS);
  const startedAt = resume?.startedAt ?? isoAt(nowMs);
  let more: string | undefined;
  const result = await pollNewItems<unknown>({
    state: seeded ? state : undefined,
    maxPages: 1,
    maxEvents: PAGE_SIZE,
    seenWindow: 1000,
    idOf: (item) => String((item as { id?: unknown }).id ?? ""),
    async fetchPage() {
      const page = await orderList.execute({
        createdAtMin: since,
        limit: PAGE_SIZE,
        ...(resume ? { offset: Number(resume.offset) } : {}),
      }, ctx) as { data?: unknown[]; nextOffset?: string | null };
      more = page.nextOffset ?? undefined;
      return { items: page.data ?? [] };
    },
  });
  if (!seeded) {
    return { events: [], nextState: { ...result.nextState, cursor: startedAt } };
  }
  // Cursor moves only once the window is drained; until then resume where this check stopped.
  return {
    events: result.events,
    nextState: more !== undefined
      ? { ...result.nextState, cursor: s.cursor, resume: { since, offset: more, startedAt } }
      : { ...result.nextState, cursor: startedAt },
  };
}

const trigger: TriggerDefinition = {
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created order.",
  output: [{ key: "id", type: "number", label: "Order ID" }],
  sample: { id: 101 },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => check(state, ctx),
};
export default trigger;
