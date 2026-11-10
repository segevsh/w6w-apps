import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * Bounded-collection polls over Zoom's list actions (brief §9.1 c). A Zoom list answers up to 300
 * rows a page and a `next_page_token`; the whole collection is read (at most `MAX_PAGES` pages) and
 * compared check to check with `pollSnapshot`, emitting added rows only. The collections are
 * bounded by Zoom itself: meetings and webinars lists "only return a user's unexpired" ones
 * (https://developers.zoom.us/docs/api/meetings/ , verified 2026-11-10) and the users list is the
 * account's own roster. A collection past the pages read is refused, never compared partly (a
 * partial list would announce rows again once they scroll back in).
 */
export const PAGE_SIZE = 300;
export const MAX_PAGES = 16;

export interface SnapshotSpec<P> {
  key: string;
  title: string;
  description: string;
  params: Param[];
  output: OutputField[];
  sample: unknown;
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  /** The list action's input for one check (without paging). */
  input(params: P): Record<string, unknown>;
  /** The key in the action's result that holds the rows. */
  rows: string;
  idOf(row: Record<string, unknown>): unknown;
  /** Names the collection in the "too many rows" error. */
  noun: string;
}

async function readAll(
  spec: SnapshotSpec<never>,
  base: Record<string, unknown>,
  ctx: HookContext,
): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = [];
  let token: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await (spec.action.execute as unknown as (
      input: Record<string, unknown>,
      ctx: HookContext,
    ) => Promise<Record<string, unknown>>)(
      { ...base, pageSize: PAGE_SIZE, nextPageToken: token },
      ctx,
    );
    const rows = res?.[spec.rows];
    if (Array.isArray(rows)) out.push(...rows as Array<Record<string, unknown>>);
    token = typeof res?.next_page_token === "string" && res.next_page_token !== ""
      ? res.next_page_token
      : undefined;
    if (token === undefined) return out;
  }
  throw new Error(
    `Zoom has more ${spec.noun} than this trigger can compare (${MAX_PAGES * PAGE_SIZE}).`,
  );
}

export function snapshotTrigger<P extends Record<string, unknown>>(
  spec: SnapshotSpec<P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const rows = await readAll(spec as unknown as SnapshotSpec<never>, spec.input(params), ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: rows.map((row) => ({ key: String(spec.idOf(row) ?? ""), values: row })),
        emit: { added: true, updated: false, removed: false },
      });
      return { events: events.map((change) => change.values), nextState };
    },
  };
}
