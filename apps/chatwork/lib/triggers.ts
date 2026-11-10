import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";

type Item = Record<string, unknown>;

/** Chatwork answers an empty list with 204 (normalised to `[]` by the client); anything else is no rows. */
export const rowsOf = (r: unknown): Item[] => (Array.isArray(r) ? (r as Item[]) : []);

/**
 * Chatwork lists carry no sort argument, so a newest-first trigger orders the rows itself by a
 * strictly increasing numeric id (`task_id`, `file_id`) before the poll kit dedupes them.
 */
export function newestFirstBy(idKey: string): (r: unknown) => Item[] {
  return (r) => rowsOf(r).slice().sort((a, b) => Number(b[idKey] ?? 0) - Number(a[idKey] ?? 0));
}

export function newestFirstTrigger<P>(spec: {
  key: string;
  title: string;
  description: string;
  action: unknown;
  input(params: P): Record<string, unknown>;
  idKey: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition<P> {
  return pollFromListAction<P>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action as ActionDefinition,
    input: spec.input,
    params: spec.params,
    items: newestFirstBy(spec.idKey),
    idOf: (v) => String((v as Item)[spec.idKey] ?? ""),
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  });
}

/**
 * A small collection that the API returns whole (rooms, contacts, pending requests, one chat's
 * members): every check diffs the ids against the previous check (`pollSnapshot`, added only).
 */
export function snapshotTrigger<P>(spec: {
  key: string;
  title: string;
  description: string;
  action: unknown;
  input(params: P): Record<string, unknown>;
  idKey: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition<P> {
  const action = spec.action as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const items = rowsOf(await action.execute(spec.input(params), ctx));
      const byId = new Map<string, Item>();
      for (const it of items) byId.set(String(it[spec.idKey] ?? ""), it);
      byId.delete("");
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key) as Item), nextState };
    },
  };
}
