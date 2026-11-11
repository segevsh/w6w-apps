import type { HookContext, OutputField, ParamDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

export const str = (v: unknown): string => String(v ?? "");

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  params?: ParamDefinition[];
  output: OutputField[];
  sample: unknown;
  /** Reads every row of the collection through the wrapped list action. */
  rows(params: Record<string, unknown>, ctx: HookContext): Promise<unknown[]>;
  idOf(item: unknown): string;
}

/**
 * "New <record>" poll over a small collection the API returns whole, in one response with no
 * paging, order or since filter: the list is snapshot-diffed, additions only (more than 5000 rows
 * throws naming the cap).
 */
export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const items = await spec.rows((params ?? {}) as Record<string, unknown>, ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: items.map((value) => ({ key: spec.idOf(value), values: value })),
        emit: { added: true, updated: false, removed: false },
        maxRows: 5000,
      });
      return { events: events.map((event) => event.values), nextState };
    },
  };
}
