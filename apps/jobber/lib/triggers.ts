import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

type Params = Record<string, unknown>;
type Item = Record<string, unknown>;

/** The kit's snapshot ceiling; a walk that reaches it fails loudly instead of missing records. */
export const MAX_ROWS = 5000;
/** Jobber caps a connection at 100 per page. */
export const PAGE_SIZE = 100;
/** 5000 rows / 100 per page, plus one page to prove the cap was crossed. */
const MAX_PAGES = MAX_ROWS / PAGE_SIZE + 1;

/** One Relay connection out of a query result: its `nodes` and the cursor of the next page. */
const connection = (result: unknown, field: string) =>
  (result as
    | Record<
      string,
      {
        nodes?: Item[];
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      } | undefined
    >
    | null)?.[field];

/**
 * Cursor-walk snapshot feed (brief 9.1 c) for a Jobber GraphQL connection with no documented sort
 * argument. Each check walks the connection through the wrapped list action — the SAME `execute`,
 * client and auth — 100 nodes per page, following `pageInfo.endCursor` while `hasNextPage` is true,
 * and diffs the ids with `pollSnapshot`. The first check records the ids and emits nothing. A
 * connection past the kit's 5000-record ceiling throws instead of silently dropping records.
 */
export function snapshotFeed(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** The connection field in the query result (`products`, `properties`, `users`). */
  field: string;
  /** The action input for one page; `after` is `undefined` on the first page. */
  input(o: { params: Params; after: string | undefined; first: number }): Params;
  idOf(item: Item): string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const run = spec.action.execute as unknown as (i: Params, c: HookContext) => Promise<unknown>;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx: HookContext) {
      const rows = new Map<string, { key: string; values: unknown }>();
      let after: string | undefined;
      for (let page = 0;; page++) {
        if (page >= MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${MAX_ROWS} records; the snapshot trigger cannot cover it`,
          );
        }
        const result = await run(
          spec.input({ params: params as Params, after, first: PAGE_SIZE }),
          ctx,
        );
        const conn = connection(result, spec.field);
        for (const item of conn?.nodes ?? []) {
          const key = spec.idOf(item);
          if (key && !rows.has(key)) rows.set(key, { key, values: item });
        }
        if (!conn?.pageInfo?.hasNextPage || !conn.pageInfo.endCursor) break;
        after = conn.pageInfo.endCursor;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...rows.values()],
        emit: { added: true, updated: false },
        maxRows: MAX_ROWS,
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
