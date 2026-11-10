import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

/** Re-read this much before the saved cursor, so clock skew and in-flight rows are not lost. */
const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;

interface Resume {
  since: string;
  page: number;
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
  const pageNo = resume?.page ?? 1;
  let more = false;
  const result = await pollNewItems<unknown>({
    state: seeded ? state : undefined,
    maxPages: 1,
    maxEvents: PAGE_SIZE,
    seenWindow: 1000,
    idOf: (item) => String((item as { id?: unknown }).id ?? ""),
    async fetchPage() {
      const page = await contactList.execute({
        createdAfter: since,
        perPage: PAGE_SIZE,
        ...(pageNo > 1 ? { page: pageNo } : {}),
      }, ctx) as { data?: unknown[]; total?: number };
      const items = page.data ?? [];
      more = typeof page.total === "number"
        ? pageNo * PAGE_SIZE < page.total
        : items.length >= PAGE_SIZE;
      return { items };
    },
  });
  if (!seeded) {
    return { events: [], nextState: { ...result.nextState, cursor: startedAt } };
  }
  // Cursor moves only once the window is drained; until then resume at the next page.
  return {
    events: result.events,
    nextState: more
      ? { ...result.nextState, cursor: s.cursor, resume: { since, page: pageNo + 1, startedAt } }
      : { ...result.nextState, cursor: startedAt },
  };
}

const trigger: TriggerDefinition = {
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101 },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => check(state, ctx),
};
export default trigger;
