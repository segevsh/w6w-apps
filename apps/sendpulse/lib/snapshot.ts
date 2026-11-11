import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * A "New <record>" trigger over a small collection that the vendor returns whole (brief 9.1 c): the
 * rows are watched as a snapshot and only added rows are events. `rows` reads through the wrapped
 * list action, so the request, client and auth are the action's own.
 */
export function snapshotTrigger<P = Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  rows(params: P, ctx: HookContext): Promise<Array<Record<string, unknown>>>;
  idOf(row: Record<string, unknown>): string;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    ...(spec.params ? { params: spec.params } : {}),
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const rows = await spec.rows(params as P, ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true, updated: false },
        rows: rows.map((r) => ({ key: spec.idOf(r), values: r })),
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}

/** The `data` array of a CRM list response. */
export function dataOf(res: unknown): Array<Record<string, unknown>> {
  const d = (res as { data?: unknown } | null)?.data;
  return Array.isArray(d) ? d as Array<Record<string, unknown>> : [];
}
