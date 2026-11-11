import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { providerIdParam } from "./params.ts";
import type { Page } from "./outputs.ts";

/**
 * Shared shape of the bounded-collection "New <record>" poll triggers.
 *
 * Venues, instructors, staff, courses, membership plans and offering types are the
 * business's own vocabulary — dozens to a few hundred rows, never a feed. TeamUp's
 * list operations document no creation order or created-after filter for them, so
 * each trigger reads the WHOLE collection through the wrapped list action (the same
 * request, client and auth as the action — `page_size` 100 is the documented
 * maximum) and lets `pollSnapshot` report the ids it has not seen. Source:
 * <https://docs.goteamup.com/llms.txt> (OpenAPI index, verified 2026-11-10).
 */

/** 5000 rows = 50 full pages; more than that and `pollSnapshot` throws naming the cap. */
const MAX_ROWS = 5000;
const PAGE_SIZE = 100;

export const snapshotOutput: OutputField[] = [
  { key: "change", type: "string", label: "Change (added)" },
  { key: "key", type: "string", label: "Record ID" },
  { key: "values", type: "object", label: "The record" },
];

/** Every record of a TeamUp list, page by page (the `next` link is the stop signal). */
export async function readAll(
  action: ActionDefinition,
  params: Record<string, unknown>,
  ctx: HookContext,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 1; page <= MAX_ROWS / PAGE_SIZE + 1; page++) {
    const result = await action.execute({ ...params, page, page_size: PAGE_SIZE }, ctx) as Page;
    const batch = result.results ?? [];
    rows.push(...batch);
    if (!result.next || batch.length === 0) break;
  }
  return rows;
}

export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  sample: Record<string, unknown>;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [providerIdParam],
    output: snapshotOutput,
    sample: { change: "added", key: String(spec.sample.id), values: spec.sample },
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const rows = await readAll(spec.action, params as Record<string, unknown>, ctx);
      return await pollSnapshot({
        state,
        maxRows: MAX_ROWS,
        emit: { added: true, updated: false },
        rows: rows.map((r) => ({ key: String((r as { id?: unknown }).id ?? ""), values: r })),
      });
    },
  };
}
