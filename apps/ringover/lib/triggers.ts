import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Most records one snapshot check reads; a larger set fails loudly instead of being half-read. */
export const MAX_ROWS = 5000;

/**
 * A bounded-collection poll over an EXISTING list action: every check reads the whole collection
 * through the SAME `action.execute(...)` (offset paging with `limitCount`/`limitOffset` when
 * `pageSize` is set, a single request otherwise) and diffs the ids with `pollSnapshot` (added only).
 * The first check records what exists and emits nothing. Events are the raw items. The list
 * endpoints used here document no created-at order or filter, so a newest-first window does not exist.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  /** Offset page size (the endpoint's documented maximum); omit for an endpoint that is not paged. */
  pageSize?: number;
  items(result: unknown): unknown[];
  idOf(item: unknown): string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(`snapshotTrigger(${spec.key}): action ${spec.action.key} is not a list action`);
  }
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const byId = new Map<string, unknown>();
      let offset = 0;
      for (;;) {
        const result = await spec.action.execute(
          spec.pageSize === undefined ? {} : { limitCount: spec.pageSize, limitOffset: offset },
          ctx,
        );
        const items = spec.items(result);
        for (const item of items) byId.set(spec.idOf(item), item);
        if (spec.pageSize === undefined || items.length < spec.pageSize) break;
        offset += spec.pageSize;
        if (offset >= MAX_ROWS) {
          throw new Error(`${spec.key}: the collection holds more than ${MAX_ROWS} records`);
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId].map(([key, values]) => ({ key, values })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
