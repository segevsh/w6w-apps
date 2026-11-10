import type { HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** A list action as the snapshot reads it: just its execute. */
interface ListAction {
  execute(input: Record<string, unknown>, ctx: HookContext): unknown;
}

/** Rows a snapshot trigger reads per check: `PAGE_SIZE` per request, at most `MAX_PAGES` requests. */
export const SNAPSHOT_PAGE_SIZE = 100;
export const SNAPSHOT_MAX_PAGES = 5;

interface Listed {
  value?: Array<Record<string, unknown>>;
  nextLink?: string;
}

/**
 * Run a Graph list action (the SAME request the action makes) and diff the whole collection with
 * the last check. Only rows that were added are emitted; a rename or other edit is not an event.
 * A collection longer than the page cap fails the check loudly instead of being half-read.
 */
export async function snapshotAdded(
  action: ListAction,
  input: Record<string, unknown>,
  state: unknown,
  ctx: HookContext,
  noun: string,
): Promise<{ events: unknown[]; nextState: unknown }> {
  const res = await action.execute(
    { ...input, top: SNAPSHOT_PAGE_SIZE, all: true, maxPages: SNAPSHOT_MAX_PAGES },
    ctx,
  ) as Listed;
  if (res.nextLink) {
    throw new Error(
      `more than ${
        SNAPSHOT_PAGE_SIZE * SNAPSHOT_MAX_PAGES
      } ${noun} in one list; this trigger cannot snapshot it`,
    );
  }
  const { events, nextState } = await pollSnapshot({
    state,
    rows: (res.value ?? []).map((row) => ({ key: String(row.id ?? ""), values: row })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => e.values), nextState };
}
