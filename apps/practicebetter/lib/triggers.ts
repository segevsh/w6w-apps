import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { type IdsState, pollNewItems } from "../../_shared/poll/mod.ts";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Pages read per check. Records beyond MAX_PAGES x page size inside one window are skipped. */
export const MAX_PAGES = 3;

/** The kit's ids envelope plus the epoch milliseconds of the last successful check. */
export interface SinceState extends IdsState {
  cursor: number;
}

/** `2026-11-10T09:58:00Z` — whole seconds, the form every vendor filter accepts. */
const stamp = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * A since-filter poll over an EXISTING list/search action: each check runs the SAME
 * `action.execute(...)` with the filter set to `last check - OVERLAP_MS`, reads up to MAX_PAGES
 * pages, and emits ids not seen before (kit dedupe). The first check seeds and emits nothing.
 */
export function sinceTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  pageSize: number;
  input(window: { since: string; until: string }): Record<string, unknown>;
  nextPageInput?(
    input: Record<string, unknown>,
    result: unknown,
  ): Record<string, unknown> | undefined;
  items(result: unknown): unknown[];
  idOf(item: unknown): string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}): TriggerDefinition {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(`sinceTrigger(${spec.key}): action ${spec.action.key} is not a list action`);
  }
  const maxEvents = MAX_PAGES * spec.pageSize;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    async poll({ state }, ctx) {
      const checkedAt = clock.now();
      const prior = state as { cursor?: unknown } | null;
      const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
      const { events, nextState } = await pollNewItems<unknown>({
        state,
        maxPages: 1,
        maxEvents,
        seenWindow: maxEvents * 2,
        idOf: spec.idOf,
        async fetchPage() {
          const items: unknown[] = [];
          let input: Record<string, unknown> | undefined = spec.input({
            since: stamp(cursor - OVERLAP_MS),
            until: stamp(checkedAt),
          });
          for (let page = 0; input && page < MAX_PAGES; page++) {
            const result = await spec.action.execute(input, ctx);
            items.push(...spec.items(result));
            input = spec.nextPageInput?.(input, result);
          }
          return { items };
        },
      });
      return { events, nextState: { ...nextState, cursor: checkedAt } as SinceState };
    },
  };
}
