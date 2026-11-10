import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Items per vendor page read by a snapshot trigger. */
export const SNAPSHOT_PAGE = 50;
/** Vendor pages read per check; a larger collection throws a clear error instead of truncating. */
export const SNAPSHOT_MAX_PAGES = 20;

export interface SnapshotSpec<T, P = Record<string, unknown>> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** One page of the collection starting at `offset`, `SNAPSHOT_PAGE` items at most. */
  fetchPage(offset: number, ctx: HookContext, params: P): Promise<T[]>;
  idOf(item: T): string;
}

/**
 * Bounded-collection poll (brief 9.1 c): every check reads the whole collection page by page
 * (`limit`/`offset`, stopping at the first short page), diffs the ids with `pollSnapshot` and
 * emits only the added ones. The first check seeds and emits nothing.
 */
export function snapshotTrigger<T, P = Record<string, unknown>>(
  spec: SnapshotSpec<T, P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const byId = new Map<string, T>();
      for (let n = 0;; n++) {
        if (n >= SNAPSHOT_MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${
              SNAPSHOT_MAX_PAGES * SNAPSHOT_PAGE
            } records; too large to watch`,
          );
        }
        const items = await spec.fetchPage(n * SNAPSHOT_PAGE, ctx, params);
        for (const item of items) byId.set(spec.idOf(item), item);
        if (items.length < SNAPSHOT_PAGE) break;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key) as T), nextState };
    },
  };
}
