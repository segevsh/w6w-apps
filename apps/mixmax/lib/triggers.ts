import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * "New <record>" over a collection with no newest-first order: read it through the wrapped list
 * action and diff the `_id`s (`pollSnapshot`, added only). The seed check records the ids and
 * emits nothing. A collection the API returns whole needs nothing more; a cursor-paged one sets
 * `paged`, and the check follows the action's `next` cursor up to `maxPages` pages of `limit` and
 * THROWS if a further page remains (a truncated snapshot would report the unseen tail as new).
 */
export function snapshotTrigger<P extends Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never, never>;
  params?: Param[];
  input(params: P): Record<string, unknown>;
  paged?: { limit: number; maxPages: number };
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
      const action = spec.action as unknown as ActionDefinition;
      type Page = { results?: unknown[]; next?: string; hasNext?: boolean };
      const items: unknown[] = [];
      if (spec.paged) {
        let next: string | undefined;
        for (let n = 1;; n++) {
          const res = await action.execute(
            { ...spec.input(params), limit: spec.paged.limit, next },
            ctx,
          ) as Page;
          items.push(...(res.results ?? []));
          if (res.hasNext !== true || !res.next) break;
          if (n >= spec.paged.maxPages) {
            throw new Error(
              `Mixmax: ${spec.title} has more than ${
                spec.paged.maxPages * spec.paged.limit
              } records; ` +
                "refusing to snapshot a partial list",
            );
          }
          next = res.next;
        }
      } else {
        items.push(...((await action.execute(spec.input(params), ctx)) as Page).results ?? []);
      }
      const byId = new Map<string, unknown>();
      for (const item of items) {
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
