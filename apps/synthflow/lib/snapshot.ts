import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** A snapshot reads at most this many pages of `SNAPSHOT_PAGE` rows, then refuses (never truncates). */
export const SNAPSHOT_PAGES = 10;
export const SNAPSHOT_PAGE = 100;

type Row = Record<string, unknown>;

/**
 * Offset-paged lists (`limit` / `offset`; the action returns `{ items, pagination }` where
 * `pagination.total_records` is the vendor's total). Synthflow documents no sort or filter on these
 * lists, so the whole list is read and watched as a snapshot (brief 9.1 c).
 */
export async function readOffsetPages(
  key: string,
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>,
  extra: Row,
  ctx: HookContext,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 0; page < SNAPSHOT_PAGES; page++) {
    const offset = page * SNAPSHOT_PAGE;
    const res = await action.execute({ ...extra, limit: SNAPSHOT_PAGE, offset }, ctx) as {
      items?: Row[];
      pagination?: { total_records?: number };
    };
    const items = res.items ?? [];
    rows.push(...items);
    const total = res.pagination?.total_records;
    const more = typeof total === "number" ? offset + items.length < total : false;
    if (items.length === 0 || !more) return rows;
  }
  throw new Error(
    `${key}: more than ${
      SNAPSHOT_PAGES * SNAPSHOT_PAGE
    } rows; the trigger watches at most that many`,
  );
}

/** A "New <record>" trigger: only added rows are events; a repeated key within one read collapses. */
export function snapshotTrigger<P = Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  rows(params: P, ctx: HookContext): Promise<Row[]>;
  idOf(row: Row): string;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    ...(spec.params ? { params: spec.params } : {}),
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const byKey = new Map<string, Row>();
      for (const r of await spec.rows(params as P, ctx)) byKey.set(spec.idOf(r), r);
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true, updated: false },
        rows: [...byKey].map(([key, values]) => ({ key, values })),
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
