import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Page size asked of the cursor-paged lists (the action's own `limit`). */
export const SNAPSHOT_PAGE_SIZE = 200;
/** Pages read per check; 25 x 200 = 5000, the kit's row cap. A collection beyond it fails loudly. */
export const SNAPSHOT_MAX_PAGES = 25;

/**
 * "New <record>" over a list that Pylon documents no order or time filter for: each check reads the
 * whole collection through the SAME list action (following `nextCursor` while `hasNextPage`) and
 * `pollSnapshot` emits the ids not present at the previous check (added only; the first check
 * seeds). A collection of more than 5000 rows throws an error naming the cap.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  /** The first request; a paged list is asked `SNAPSHOT_PAGE_SIZE` rows at a time. */
  input(params: Record<string, unknown>): Record<string, unknown>;
  paged: boolean;
  items(result: unknown): unknown[];
  idOf(item: unknown): string;
  params?: Param[];
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
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const items: unknown[] = [];
      let input: Record<string, unknown> | undefined = spec.input(params ?? {});
      for (let page = 0; input; page++) {
        if (page >= SNAPSHOT_MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${
              SNAPSHOT_MAX_PAGES * SNAPSHOT_PAGE_SIZE
            } rows; too large to compare`,
          );
        }
        const result = await spec.action.execute(input, ctx) as
          & Record<string, unknown>
          & { hasNextPage?: boolean; nextCursor?: string };
        items.push(...spec.items(result));
        input = spec.paged && result.hasNextPage && result.nextCursor
          ? { ...input, cursor: result.nextCursor }
          : undefined;
      }
      const byId = new Map<string, unknown>();
      for (const item of items) {
        const id = spec.idOf(item);
        if (id !== "" && !byId.has(id)) byId.set(id, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}

/** A record's own `id`, or "" when it has none. */
export const idField = (item: unknown): string => {
  const id = (item as { id?: unknown } | null)?.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : "";
};
