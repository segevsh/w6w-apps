import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Kustomer's documented maximum page size for list endpoints. */
const PAGE_SIZE = 100;
/** 50 pages x 100 = the 5000-row cap `pollSnapshot` enforces; past it the check throws, never truncates. */
const MAX_PAGES = 51;

/**
 * Shape (c) for Kustomer collections whose list endpoint documents no created/updated sort or
 * filter (users, teams, the messages and notes of one conversation): every check pages through the
 * WHOLE collection with the existing list action (`page` 1..n, `pageSize` 100, until a short page)
 * and emits only the ids added since the last check.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  input?: (params: Record<string, unknown>) => Record<string, unknown>;
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
      for (const param of spec.params ?? []) {
        const v = (params as Record<string, unknown>)[param.key];
        if (param.required && (typeof v !== "string" || v.trim() === "")) {
          throw new Error(`\`${param.key}\` is required`);
        }
      }
      const base = spec.input?.(params as Record<string, unknown>) ?? {};
      const rows: Array<{ key: string; values: unknown }> = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await spec.action.execute({ ...base, page, pageSize: PAGE_SIZE }, ctx) as {
          data?: Array<{ id?: unknown }>;
        };
        const items = Array.isArray(res?.data) ? res.data : [];
        for (const item of items) {
          if (typeof item.id === "string" && item.id !== "") {
            rows.push({ key: item.id, values: item });
          }
        }
        if (items.length < PAGE_SIZE) break;
        if (page === MAX_PAGES) {
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
