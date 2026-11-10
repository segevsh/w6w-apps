import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * A "New <record>" poll trigger over a small, bounded AWeber collection (one account's lists, one
 * list's segments or tags): the whole collection is read in one request (`ws.size` is capped at
 * 100 by AWeber) and compared with the previous check; only additions are emitted.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params: Param[];
  input(params: Record<string, unknown>): Record<string, unknown>;
  rows(result: unknown): unknown[];
  keyOf(row: unknown): string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 900_000,
    async poll({ params, state }, ctx) {
      const result = await spec.action.execute(spec.input(params as Record<string, unknown>), ctx);
      return await pollSnapshot({
        state,
        maxRows: 5000,
        emit: { added: true },
        rows: spec.rows(result).map((row) => ({ key: spec.keyOf(row), values: row })),
      });
    },
  };
}

/** The `entries` array of an AWeber collection response. */
export const entries = (result: unknown): unknown[] =>
  (result as { entries?: unknown[] }).entries ?? [];
