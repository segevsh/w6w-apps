import type { HookContext, OutputField, ParamDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Hard cap on rows one check may diff; `pollSnapshot` throws naming it when exceeded. */
export const MAX_ROWS = 5000;
/** Pages one check may read while draining a token-paged collection. */
export const MAX_PAGES = 50;

/**
 * Reads every page of a token-paged list (`next_token` / `next_set_token`) and returns the rows.
 * Throws, naming the cap, when the collection is longer than `MAX_PAGES` pages; a repeated token
 * (a vendor that does not advance) ends the walk instead of looping.
 */
export async function drainPages<T>(
  fetchPage: (token?: string) => Promise<{ items: T[]; next?: string }>,
): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let token: string | undefined;
  for (let n = 0; n < MAX_PAGES; n++) {
    const { items, next } = await fetchPage(token);
    rows.push(...items);
    if (!next || seen.has(next)) return rows;
    seen.add(next);
    token = next;
  }
  throw new Error(
    `zoho-cliq list is longer than ${MAX_PAGES} pages; refusing to diff a partial list`,
  );
}

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  params?: ParamDefinition[];
  output: OutputField[];
  sample: unknown;
  /** Reads every row of the collection through the wrapped list action. */
  rows(params: Record<string, unknown>, ctx: HookContext): Promise<unknown[]>;
  idOf(item: unknown): string;
}

/** "New <record>" poll over a collection the vendor lists without a usable order or since filter. */
export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const items = await spec.rows((params ?? {}) as Record<string, unknown>, ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: items.map((value) => ({ key: spec.idOf(value), values: value })),
        emit: { added: true, updated: false, removed: false },
        maxRows: MAX_ROWS,
      });
      return { events: events.map((event) => event.values), nextState };
    },
  };
}

export const str = (v: unknown): string => String(v ?? "");
