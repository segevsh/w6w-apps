import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Salla's documented maximum `per_page` (https://docs.salla.dev/pagination.md). */
const PER_PAGE = 60;

/**
 * A "new <record>" poll over a Salla list that documents NO sort order and NO created-since filter.
 * Without either, the only order-independent way to find a new record is to read the whole list:
 * each check walks `page=1…totalPages` of the SAME list action (60 per page) and diffs the ids
 * against the previous check (`pollSnapshot`, added only). A list longer than `maxPages` pages
 * throws an error naming the cap instead of silently missing records.
 */
export function pagedSnapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  maxPages: number;
  params?: Param[];
  input?(params: Record<string, unknown>): Record<string, unknown>;
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}): TriggerDefinition {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(`pagedSnapshotTrigger(${spec.key}): ${spec.action.key} is not a list action`);
  }
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    async poll({ params, state }, ctx) {
      const byId = new Map<string, unknown>();
      for (let page = 1;; page++) {
        const result = await spec.action.execute(
          { ...(spec.input?.(params as Record<string, unknown>) ?? {}), page, per_page: PER_PAGE },
          ctx,
        ) as { data?: Array<{ id?: unknown }>; pagination?: { totalPages?: number } };
        for (const item of result.data ?? []) {
          if (item.id !== undefined && item.id !== null) byId.set(String(item.id), item);
        }
        const totalPages = Number(result.pagination?.totalPages ?? 1);
        if (page >= totalPages) break;
        if (page >= spec.maxPages) {
          throw new Error(
            `${spec.key}: the list has ${totalPages} pages of ${PER_PAGE}; this trigger reads at most ${spec.maxPages}`,
          );
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true, updated: false },
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
