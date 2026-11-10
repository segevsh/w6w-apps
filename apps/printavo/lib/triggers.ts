import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Printavo connection page size used by the poll triggers (the existing `new-task` uses it too). */
export const PAGE_SIZE = 100;
/** Pages read per check by a snapshot trigger; more than this fails loudly. */
export const SNAPSHOT_MAX_PAGES = 5;

interface Connection {
  nodes?: unknown[];
  hasNextPage?: boolean;
  endCursor?: string | null;
}

const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");

/** "New <record>" over a small filtered list: read it whole and diff the ids (added only). */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never, never>;
  input: Record<string, unknown>;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const action = spec.action as unknown as ActionDefinition;
      const byId = new Map<string, unknown>();
      let after: string | undefined;
      for (let page = 1;; page++) {
        const res = await action.execute(
          { ...spec.input, first: PAGE_SIZE, after },
          ctx,
        ) as Connection;
        for (const item of res.nodes ?? []) {
          const id = idOf(item);
          if (id === "") throw new Error(`Printavo: ${spec.title} got a record without an id`);
          byId.set(id, item);
        }
        if (!res.hasNextPage || !res.endCursor) break;
        if (page >= SNAPSHOT_MAX_PAGES) {
          throw new Error(
            `Printavo: ${spec.title} read ${SNAPSHOT_MAX_PAGES} pages of ${PAGE_SIZE} and there are more; the list is too large to snapshot`,
          );
        }
        after = res.endCursor;
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
