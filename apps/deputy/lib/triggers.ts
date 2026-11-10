import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollNewItems, pollSnapshot } from "../../_shared/poll/mod.ts";
import { DeputyClient } from "./client.ts";

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

/**
 * Newest-first poll over `POST /resource/{Object}/QUERY` for a resource that has a list action
 * (`GET /resource/{Object}`, first 500 records in id order, no way to ask for the newest) but no
 * search action. Same client and endpoint the search actions use; one page of 100 per check,
 * deduped by `idOf` through the kit.
 */
export function queryTrigger(spec: {
  key: string;
  title: string;
  description: string;
  object: string;
  sort: Record<string, "asc" | "desc">;
  idOf(item: unknown): string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 300_000,
    output: spec.output,
    sample: spec.sample,
    async poll({ state }, ctx) {
      const { events, nextState } = await pollNewItems<unknown>({
        state,
        idOf: spec.idOf,
        maxPages: 1,
        async fetchPage() {
          const items = await new DeputyClient(ctx).query(spec.object, {
            sort: spec.sort,
            start: 0,
            max: 100,
          });
          return { items };
        },
      });
      return { events, nextState };
    },
  };
}
