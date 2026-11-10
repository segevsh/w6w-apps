import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Vanta pages 100 rows at a time and the action walks at most 50 pages: 5000 rows. */
export const MAX_ROWS = 5000;

/**
 * "New <record>" for a Vanta list that has no sort order and no created-since filter
 * (https://developer.vanta.com/reference/manage-vanta). The whole collection is read through the
 * SAME list action (`returnAll`, every page) and snapshot-diffed, additions only. A collection of
 * more than `MAX_ROWS` rows fails the check with a clear error instead of reading a silent prefix.
 */
export function snapshotTrigger(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  /** Name of the array in the action's result. */
  listKey: string;
  /** Property carrying the record's stable id. */
  idKey: string;
  /** Fixed action arguments (e.g. an "any status" filter), applied under the user's params. */
  input?: Record<string, unknown>;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    type: "poll",
    minIntervalMs: 300_000,
    params: o.params,
    output: o.output,
    sample: o.sample,
    async poll({ params, state }, ctx) {
      const out = await o.action.execute(
        { ...o.input, ...(params as Record<string, unknown>), returnAll: true, maxPages: 50 },
        ctx,
      ) as Record<string, unknown>;
      if (out.hasNextPage === true) {
        throw new Error(
          `Vanta ${o.listKey} exceed ${MAX_ROWS} rows; too many to watch for new ones`,
        );
      }
      const rows: Array<{ key: string; values: unknown }> = [];
      for (const item of (out[o.listKey] as unknown[] | undefined) ?? []) {
        const id = (item as Record<string, unknown>)[o.idKey];
        if (typeof id === "string" && id !== "") rows.push({ key: id, values: item });
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false, removed: false },
        maxRows: MAX_ROWS,
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
