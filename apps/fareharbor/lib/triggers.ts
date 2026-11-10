import type { ActionDefinition, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * A poll trigger that re-reads a whole FareHarbor collection through its existing list action
 * (same client, endpoint and auth) and diffs it with `pollSnapshot`.
 *
 * FareHarbor's list endpoints document no created/updated cursor and no newest-first order, so
 * the collection is diffed instead. `added` is a new record; `updated` is any change to the record
 * (`new-or-updated-…` triggers). A removed record never fires. The first check only records
 * hashes, so existing records are never emitted. More than 5000 rows fails loudly (kit cap).
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  params?: Param[];
  items(result: unknown): unknown[];
  idOf(item: unknown): string;
  updated?: boolean;
  output: TriggerDefinition["output"];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const p = (params ?? {}) as Record<string, unknown>;
      const list = spec.items(await spec.action.execute(p, ctx));
      const rows = new Map<string, unknown>();
      for (const item of list) {
        const key = spec.idOf(item);
        if (key && !rows.has(key)) rows.set(key, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...rows].map(([key, values]) => ({ key, values })),
        emit: { added: true, updated: spec.updated === true, removed: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
