import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * A "New <record>" poll trigger over a SMALL, BOUNDED collection (brief §9.1 c): each check runs
 * the wrapped list action exactly as the action runs it (same client, endpoint and auth), keys
 * every row by `keyOf`, and `pollSnapshot` emits the keys that were not there at the previous
 * check. The first check seeds and emits nothing. State holds only `{ key: hash }`.
 */
export function snapshotTrigger<P extends Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params?: TriggerDefinition["params"];
  input(params: P): Record<string, unknown>;
  items(result: unknown): unknown[];
  keyOf(item: unknown): string;
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    output: spec.output,
    sample: spec.sample,
    async poll({ params, state }, ctx) {
      const result = await spec.action.execute(spec.input((params ?? {}) as P), ctx);
      const byKey = new Map<string, unknown>();
      for (const item of spec.items(result)) {
        const k = spec.keyOf(item);
        if (k && !byKey.has(k)) byKey.set(k, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byKey.keys()].map((key) => ({ key, values: key })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byKey.get(e.key)), nextState };
    },
  };
}
