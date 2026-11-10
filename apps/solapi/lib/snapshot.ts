import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** A snapshot reads at most this many pages of `SNAPSHOT_PAGE` rows, then refuses (never truncates). */
export const SNAPSHOT_PAGES = 10;
export const SNAPSHOT_PAGE = 100;

type Row = Record<string, unknown>;
// deno-lint-ignore no-explicit-any
type AnyAction = ActionDefinition<any>;

/** Cursor-paged lists (`{ items, nextKey }`, `limit` / `startKey`). */
export async function readCursor(
  key: string,
  action: AnyAction,
  ctx: HookContext,
  extra: Row = {},
): Promise<Row[]> {
  const rows: Row[] = [];
  let startKey: string | undefined;
  for (let page = 0; page < SNAPSHOT_PAGES; page++) {
    const res = await action.execute({ ...extra, limit: SNAPSHOT_PAGE, startKey }, ctx) as {
      items?: Row[];
      nextKey?: string | null;
    };
    rows.push(...(res.items ?? []));
    if (!res.nextKey) return rows;
    startKey = res.nextKey;
  }
  throw new Error(
    `${key}: more than ${
      SNAPSHOT_PAGES * SNAPSHOT_PAGE
    } rows; the trigger watches at most that many`,
  );
}

/**
 * A "New <record>" trigger over a small collection the account lists whole (brief 9.1 c): the rows
 * are watched as a snapshot and only added rows are events. A repeated key within one read collapses.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  output: OutputField[];
  sample: unknown;
  rows(ctx: HookContext): Promise<Row[]>;
  idOf(row: Row): string;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const byKey = new Map<string, Row>();
      for (const r of await spec.rows(ctx)) byKey.set(spec.idOf(r), r);
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true, updated: false },
        rows: [...byKey].map(([key, values]) => ({ key, values })),
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
