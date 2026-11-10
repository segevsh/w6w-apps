import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * "New <record>" over a small collection the API returns whole (no paging, no order, no filter):
 * read it through the wrapped list action and diff the `_id`s (`pollSnapshot`, added only). The
 * seed check records the ids and emits nothing.
 */
export function snapshotTrigger<P extends Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never, never>;
  params?: Param[];
  input(params: P): Record<string, unknown>;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const res = await (spec.action as unknown as ActionDefinition).execute(
        spec.input(params),
        ctx,
      ) as { results?: unknown[] };
      const byId = new Map<string, unknown>();
      for (const item of res.results ?? []) {
        const id = (item as { _id?: unknown })._id;
        if (typeof id !== "string" || id === "") {
          throw new Error(`Mixmax: ${spec.title} got a record without an _id`);
        }
        byId.set(id, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
