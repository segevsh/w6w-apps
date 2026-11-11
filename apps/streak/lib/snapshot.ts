import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * A "New <record>" trigger over a collection Streak returns whole in one request (brief 9.1 c): the
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
  rows(params: P, ctx: HookContext): Promise<unknown[]>;
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
      const byKey = new Map<string, unknown>();
      for (const r of await spec.rows(params as P, ctx)) {
        byKey.set(String((r as { key?: unknown }).key ?? ""), r);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true, updated: false },
        rows: [...byKey].map(([key, values]) => ({ key, values })),
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}

/** The `results` array of a Streak list action's output. */
export function resultsOf(out: unknown): unknown[] {
  const r = (out as { results?: unknown } | null)?.results;
  return Array.isArray(r) ? r : [];
}
