import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * A "new <record>" poll over a small, bounded AgencyZoom list action: one request returns the whole
 * collection, so each check diffs the record ids against the previous check (`pollSnapshot`,
 * added only). `pick` finds the array in the action's answer, `idOf` the stable id of a record.
 */
export function snapshotTrigger<P extends Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  input: (params: P) => Record<string, unknown>;
  pick: (result: unknown) => unknown[];
  idOf: (item: unknown) => string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 300_000,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    async poll({ params, state }, ctx) {
      const result = await spec.action.execute(spec.input(params as P), ctx);
      const items = spec.pick(result).filter((i) => spec.idOf(i) !== "");
      const byId = new Map(items.map((i) => [spec.idOf(i), i]));
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}

/** `obj[key]` when it is an array, else `[]`. */
export function arrayAt(obj: unknown, ...path: string[]): unknown[] {
  let cur: unknown = obj;
  for (const p of path) cur = (cur as Record<string, unknown> | undefined)?.[p];
  return Array.isArray(cur) ? cur : [];
}

/** String id from `item[field]`, `""` when missing. */
export function idField(field: string): (item: unknown) => string {
  return (item) => {
    const v = (item as Record<string, unknown> | undefined)?.[field];
    return v === undefined || v === null ? "" : String(v);
  };
}
