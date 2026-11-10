import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollWindow } from "./window.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Pages read per check; a longer window is resumed on the next check (brief 9.8), never cut. */
export const MAX_PAGES = 20;
export const MAX_ITEMS = 1000;
export const SEEN_WINDOW = 2000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface SinceSpec<T, P = Record<string, unknown>> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** Records per full page (default 100); sizes the head batch kept across a multi-check drain. */
  pageSize?: number;
  /** One page of records at or after `sinceMs` (epoch ms); `more` is true when another page follows. */
  fetchPage(
    sinceMs: number,
    page: number,
    ctx: HookContext,
    params: P,
    token?: string,
  ): Promise<{ items: T[]; more: boolean; next?: string }>;
  idOf(item: T): string;
  /** Creation (or, for updated triggers, modification) time in ms; undefined keeps the item. */
  tsOf?(item: T): number | undefined;
}

/** Epoch ms of a vendor timestamp; a zone-less string is read as UTC. Undefined when unparseable. */
export function toMs(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value === "") return undefined;
  // A date without a time (a day-granular field) cannot be compared with the floor: keep the item.
  if (!/\d:\d\d/.test(value)) return undefined;
  const zoned = /(?:Z|[+-]\d\d:?\d\d)$/i.test(value);
  const parsed = Date.parse(zoned ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Since-filter poll (brief 9.1 b): list records changed since `cursor - overlap` with the app's
 * own list action. The first check stores `floor = now` and emits nothing; later checks drop
 * records stamped before the floor (9.9). A window longer than `MAX_PAGES` pages is resumed from
 * the persisted position on the next check and the cursor moves only once it drains (9.8).
 */
export function sinceTrigger<T, P = Record<string, unknown>>(
  spec: SinceSpec<T, P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      return await pollWindow<T, string | number>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: spec.pageSize ?? 100,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        tsOf: spec.tsOf ?? (() => undefined),
        async load(since, pos) {
          const page = typeof pos === "number" ? pos : 1;
          const token = typeof pos === "string" ? pos : undefined;
          const res = await spec.fetchPage(since, page, ctx, params, token);
          return { items: res.items, next: res.more ? (res.next ?? page + 1) : undefined };
        },
      });
    },
  };
}
