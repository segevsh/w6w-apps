import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import subscriberChanged from "../actions/subscriber-changed.ts";

export const PAGE_SIZE = 200;
/** Per-check ceiling: 5 pages of 200 ids. */
export const MAX_PAGES = 5;
export const MAX_EVENTS = 100;
export const SEEN_WINDOW = 1200;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface ContactChangedState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  /** Epoch second the next check lists from (inclusive on the vendor side). */
  cursor: number;
  /** Resume position of an unfinished window: the vendor's next page cursor and the window's end. */
  resume?: { pageCursor: string; end: number };
}

/**
 * Since-filter poll over `GET /subscriber/changed` (ids only). Each check lists the ids changed
 * from the cursor on. The vendor includes changes AT the cursor second, so the previous listing's
 * ids are remembered and skipped, which also stops the boundary second from firing twice. The
 * cursor only moves forward once every listed id was emitted. A window of more than MAX_PAGES
 * pages is drained over successive checks: the vendor's `nextCursor` after the last page read is
 * kept in state (`resume`) once that chunk was fully emitted, and the next check continues from it
 * (§9.8); a chunk with more than MAX_EVENTS unseen ids is re-read until all of it was emitted.
 */
export async function checkContactChanged(
  state: unknown,
  ctx: HookContext,
): Promise<{ events: Array<{ subscriberId: string }>; nextState: ContactChangedState }> {
  const checkedAt = Math.floor(clock.now() / 1000);
  const prior = state as
    | { cursor?: unknown; ids?: unknown; resume?: ContactChangedState["resume"] }
    | null;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const priorIds = new Set(Array.isArray(prior?.ids) ? prior.ids as string[] : []);
  const resume = prior?.resume;
  const end = resume ? resume.end : checkedAt;

  const listed: string[] = [];
  let pageCursor: string | undefined = resume?.pageCursor;
  let truncated = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await subscriberChanged.execute(
      { from: cursor, limit: PAGE_SIZE, cursor: pageCursor },
      ctx,
    ) as { subscriberIds?: string[]; nextCursor?: string | null };
    listed.push(...(res.subscriberIds ?? []).map(String));
    pageCursor = res.nextCursor ?? undefined;
    if (!pageCursor) break;
    if (page === MAX_PAGES - 1) truncated = true;
  }

  const { events, nextState } = await pollNewItems<{ subscriberId: string }>({
    state,
    maxPages: 1,
    maxEvents: MAX_EVENTS,
    seenWindow: SEEN_WINDOW,
    idOf: (c) => c.subscriberId,
    // The kit emits oldest-first from a newest-first page; listed order is kept as is.
    fetchPage: () =>
      Promise.resolve({ items: listed.map((subscriberId) => ({ subscriberId })).reverse() }),
  });

  const unseen = listed.filter((id) => !priorIds.has(id)).length;
  const complete = !truncated && unseen <= MAX_EVENTS;
  if (complete) {
    const ids = resume ? [...priorIds, ...listed] : listed;
    return {
      events,
      nextState: { v: 1, kind: "ids", seeded: true, ids: ids.slice(-SEEN_WINDOW), cursor: end },
    };
  }
  // Not drained: keep the cursor. A fully emitted chunk moves the resume position on; otherwise
  // the same chunk is read again next check.
  const next = truncated && unseen <= MAX_EVENTS ? pageCursor : resume?.pageCursor;
  return {
    events,
    nextState: next
      ? { ...nextState, cursor, resume: { pageCursor: next, end } }
      : { ...nextState, cursor },
  };
}

export const contactChangedTrigger: TriggerDefinition = {
  key: "contact-changed",
  title: "Contact Changed",
  description:
    "The run gets the id of each contact that changed (as listed by KlickTipp's changed-contacts feed) since the previous check.",
  output: [{ key: "subscriberId", type: "string", label: "Contact ID" }],
  sample: { subscriberId: "123" },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkContactChanged(state, ctx);
  },
};
