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
// deno-lint-ignore no-explicit-any
type AnyAction = ActionDefinition<any, any>;

function tooMany(key: string): Error {
  return new Error(
    `${key}: more than ${
      SNAPSHOT_PAGES * SNAPSHOT_PAGE
    } rows; the trigger watches at most that many`,
  );
}

/** Page-numbered collections (`{ data, totalPages }`, 1-based `page` / `pageSize`). */
export async function readPages(
  key: string,
  action: AnyAction,
  input: Row,
  ctx: HookContext,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 1; page <= SNAPSHOT_PAGES; page++) {
    const res = await action.execute({ ...input, page, pageSize: SNAPSHOT_PAGE }, ctx) as {
      data?: Row[];
      totalPages?: number;
    };
    rows.push(...(res.data ?? []));
    if (page >= (res.totalPages ?? 0)) return rows;
  }
  throw tooMany(key);
}

/** Token-paged collections (`{ data, lastKey }`, `maxItems` 100 is the vendor minimum). */
export async function readTokens(
  key: string,
  action: AnyAction,
  input: Row,
  ctx: HookContext,
): Promise<Row[]> {
  const rows: Row[] = [];
  let lastKey: string | undefined;
  for (let page = 0; page < SNAPSHOT_PAGES; page++) {
    const res = await action.execute({ ...input, maxItems: SNAPSHOT_PAGE, lastKey }, ctx) as {
      data?: Row[];
      lastKey?: string;
    };
    rows.push(...(res.data ?? []));
    if (!res.lastKey) return rows;
    lastKey = res.lastKey;
  }
  throw tooMany(key);
}

/**
 * A "New <record>" trigger over a collection the vendor lists whole (brief 9.1 c): the rows are
 * watched as a snapshot and only added rows are events. A repeated key within one read is collapsed.
 */
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
