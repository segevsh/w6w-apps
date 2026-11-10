import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

type PollCtx = Parameters<NonNullable<TriggerDefinition["poll"]>>[1];

/**
 * Polls a complete, cursor-paginated Drata collection as a bounded snapshot. Drata list actions
 * all expose the same `{ items, nextCursor }` envelope; keeping pagination here ensures a trigger
 * never silently watches just the first page.
 */
export function snapshotTrigger<P extends Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  action: unknown;
  params?: TriggerDefinition["params"];
  input(params: P, cursor?: string): Record<string, unknown>;
  idOf(item: unknown): string;
  output: NonNullable<TriggerDefinition["output"]>;
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const rows: Array<{ key: string; values: unknown }> = [];
      let cursor: string | undefined;
      do {
        const result = await (spec.action as ActionDefinition).execute(
          spec.input(params as P, cursor),
          ctx,
        ) as {
          items?: unknown[];
          nextCursor?: string | null;
        };
        for (const item of result.items ?? []) rows.push({ key: spec.idOf(item), values: item });
        cursor = result.nextCursor ?? undefined;
      } while (cursor && rows.length <= 5000);
      return await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: true },
        maxRows: 5000,
      });
    },
  };
}

export const snapshotOutput: OutputField[] = [
  { key: "change", type: "string", label: "Change" },
  { key: "key", type: "string", label: "Record ID" },
  { key: "values", type: "object", label: "Current record" },
];
