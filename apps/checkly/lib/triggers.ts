import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

export interface SnapshotSpec<P = Record<string, unknown>> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** Reads the WHOLE bounded collection (the app's own list action, every page). */
  load(params: P, ctx: HookContext): Promise<unknown[]>;
  idOf(item: unknown): string;
  /** Update stamp: when given, an edited record (new stamp) is emitted again, not only a new one. */
  stampOf?(item: unknown): string;
  minIntervalMs?: number;
}

/**
 * Bounded-collection poll (brief 9.1 c): each check reads the whole collection and diffs it with
 * the previous one (`pollSnapshot`, 5000-row cap, which throws naming the cap). The first check
 * records what exists and emits nothing. Without `stampOf` only new records are emitted.
 */
export function snapshotTrigger<P = Record<string, unknown>>(
  spec: SnapshotSpec<P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    async poll({ state, params }, ctx) {
      const items = await spec.load(params, ctx);
      const byId = new Map<string, unknown>();
      for (const item of items) {
        const id = spec.idOf(item);
        if (id) byId.set(id, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId].map(([key, item]) => ({
          key,
          values: spec.stampOf ? { id: key, stamp: spec.stampOf(item) } : { id: key },
        })),
        emit: { added: true, updated: spec.stampOf !== undefined },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
