import type { HookContext, OutputField, ParamDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Hard cap on rows one check may diff; `pollSnapshot` throws naming it when exceeded. */
export const MAX_ROWS = 5000;

/** The `items` array of a VBOUT `{ <name>: { count, items: [...] } }` list response. */
export function itemsOf(result: unknown, name: string): unknown[] {
  const items = ((result as Record<string, { items?: unknown } | undefined>)?.[name])?.items;
  return Array.isArray(items) ? items : [];
}

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

/** "New <record>" poll over a bounded collection the vendor returns without order or filter. */
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
        maxRows: MAX_ROWS,
      });
      return { events: events.map((event) => event.values), nextState };
    },
  };
}
