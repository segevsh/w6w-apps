import type { HookContext, OutputField, ParamDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Rows one check may diff. The action is asked for one more, so a longer list throws instead of passing silently. */
export const MAX_ROWS = 5000;

export const str = (v: unknown): string => String(v ?? "");

/** `result[field]` as an array. */
export const rowsOf = (field: string) => (result: unknown): unknown[] => {
  const rows = (result as Record<string, unknown> | null)?.[field];
  return Array.isArray(rows) ? rows : [];
};

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
 * "New <record>" poll over a tenant collection the Management API lists without a documented order
 * or since filter: the whole list is read (at most `MAX_ROWS + 1` rows) and snapshot-diffed,
 * additions only.
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
        maxRows: MAX_ROWS,
      });
      return { events: events.map((event) => event.values), nextState };
    },
  };
}

/** The action input that reads a whole list (one row past the cap, so an oversized list is detected). */
export const WHOLE_LIST = { returnAll: false, limit: MAX_ROWS + 1 } as const;
