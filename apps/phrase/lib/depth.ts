import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";

/** Phrase's maximum page size (`per_page`). */
export const PAGE_SIZE = 100;
/** Pages read per check by a snapshot trigger; more than this fails loudly. */
export const SNAPSHOT_MAX_PAGES = 5;

interface Page {
  items?: unknown[];
  nextPage?: number | null;
}

export const projectIdParam: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  required: true,
  hint: "Phrase Strings project id (from List Projects, or the project URL).",
};

const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");
const stamped = (field: string) => (item: unknown): string => {
  const o = item as Record<string, unknown>;
  return `${o.id ?? ""}:${o[field] ?? ""}`;
};

/** Newest-first list: the wrapped action sorted by `sort`/`order` (or `sort_by`), page 1 only. */
export function sortedTrigger<P extends Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never, never>;
  params?: Param[];
  /** Sort arguments in the wrapped action's own input names. */
  sort: Record<string, unknown>;
  /** `created_at` (new) or `updated_at` (new-or-updated: the id carries the stamp). */
  stamp?: "updated_at";
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition<P> {
  return pollFromListAction<P>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action as unknown as ActionDefinition,
    input: (params) => ({ ...params, ...spec.sort, page: 1, perPage: PAGE_SIZE }),
    items: (result) => (result as Page).items ?? [],
    idOf: spec.stamp ? stamped(spec.stamp) : idOf,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  }) as TriggerDefinition<P>;
}

/**
 * "New <record>" over a small collection: read up to SNAPSHOT_MAX_PAGES pages of the wrapped
 * action and diff the ids (`pollSnapshot`, added only). A longer list throws a clear error
 * rather than diffing a truncated one.
 */
export function snapshotTrigger<P extends Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never, never>;
  params?: Param[];
  input(params: P): Record<string, unknown>;
  /** The record field that identifies it (default `id`; tags carry only a `name`). */
  idField?: string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition<P> {
  const keyOf = (item: unknown): string =>
    String((item as Record<string, unknown>)[spec.idField ?? "id"] ?? "");
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
      const items: unknown[] = [];
      let page = 1;
      for (;;) {
        const res = await action.execute(
          { ...spec.input(params), page, perPage: PAGE_SIZE },
          ctx,
        ) as Page;
        items.push(...(res.items ?? []));
        if (!res.nextPage) break;
        if (page >= SNAPSHOT_MAX_PAGES) {
          throw new Error(
            `Phrase: ${spec.title} read ${SNAPSHOT_MAX_PAGES} pages of ${PAGE_SIZE} and there are more; the list is too large to snapshot`,
          );
        }
        page = res.nextPage;
      }
      const byId = new Map<string, unknown>();
      for (const item of items) {
        const id = keyOf(item);
        if (id === "") throw new Error(`Phrase: ${spec.title} got a record without an id`);
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
