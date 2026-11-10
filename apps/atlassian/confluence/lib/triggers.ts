import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";

/** Confluence v2 list actions answer with a bare array of records (`requestAll`). */
export const rows = (result: unknown): unknown[] => Array.isArray(result) ? result : [];

/** Record id as the dedupe key. */
export const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");

/** Id plus version number, so an edit (a new version) is a new event. */
export const idAndVersion = (item: unknown): string => {
  const record = item as { id?: unknown; version?: { number?: unknown } };
  return `${record.id ?? ""}:${record.version?.number ?? ""}`;
};

/** The `pageId` / `spaceId` param of a per-parent list, reused from the wrapped action. */
export const paramsOf = (action: ActionDefinition, ...keys: string[]): Param[] =>
  (action.params ?? []).filter((p) => keys.includes(p.key));

/** A newest-first poll over a v2 list action with one explicit `sort` (one page of 100). */
export function newestFirst(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  sort: string;
  idOf?: (item: unknown) => string;
  params?: Param[];
  /** Per-parent id params copied into the action input. */
  parent?: string[];
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return pollFromListAction<Record<string, unknown>>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    input: (params) => ({
      ...Object.fromEntries((spec.parent ?? []).map((k) => [k, params?.[k]])),
      sort: spec.sort,
      limit: 100,
      returnAll: false,
    }),
    items: rows,
    idOf: spec.idOf ?? idOf,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  }) as TriggerDefinition;
}

/** A "New <record>" snapshot over a small bounded Confluence collection (additions only). */
export function snapshotRows(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params?: Param[];
  parent?: string[];
  all: boolean;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 900_000,
    async poll({ params, state }, ctx) {
      const result = await spec.action.execute({
        ...Object.fromEntries(
          (spec.parent ?? []).map((k) => [k, (params as Record<string, unknown>)?.[k]]),
        ),
        limit: 100,
        returnAll: spec.all,
      }, ctx);
      return await pollSnapshot({
        state,
        maxRows: 5000,
        emit: { added: true },
        rows: rows(result).map((row) => ({ key: idOf(row), values: row })),
      });
    },
  };
}
