import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Atlas Admin API: `itemsPerPage` is documented as 1..500 (default 100). */
const PAGE_SIZE = 500;
/** 10 pages x 500 = the 5000-row cap `pollSnapshot` enforces; past it the check throws. */
const MAX_PAGES = 11;

export const PROJECT_ID_PARAM: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  required: true,
};

/**
 * Shape (c) for Atlas collections that document no sort order and no creation filter: each check
 * pages through the WHOLE collection with the existing list action (`pageNum` 1..n,
 * `itemsPerPage` 500, until a short page) and emits only the ids added since the last check.
 * `listKey` names the array the action returns its page under.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  listKey: string;
  input?: (params: Record<string, unknown>) => Record<string, unknown>;
  idOf: (item: Record<string, unknown>) => unknown;
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
    async poll({ state, params }, ctx) {
      const base = spec.input?.(params as Record<string, unknown>) ?? {};
      const rows: Array<{ key: string; values: unknown }> = [];
      for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
        const res = await spec.action.execute(
          { ...base, itemsPerPage: PAGE_SIZE, pageNum },
          ctx,
        ) as Record<string, unknown>;
        const items = (Array.isArray(res?.[spec.listKey]) ? res[spec.listKey] : []) as Array<
          Record<string, unknown>
        >;
        for (const item of items) {
          const id = spec.idOf(item);
          if (typeof id === "string" && id !== "") rows.push({ key: id, values: item });
        }
        if (items.length < PAGE_SIZE) break;
        if (pageNum === MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${PAGE_SIZE * (MAX_PAGES - 1)} records; too many to diff`,
          );
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false, removed: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
