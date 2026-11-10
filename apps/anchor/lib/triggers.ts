import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

export interface SnapshotSpec<P = Record<string, unknown>> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** Reads the WHOLE bounded collection (the app's own list action, every page). */
  load(params: P, ctx: HookContext): Promise<unknown[]>;
  idOf(item: unknown): string;
  /** Update stamp: when given, an edited record (new stamp) is emitted again, not only a new one. */
  stampOf?(item: unknown): string;
  minIntervalMs?: number;
}

/**
 * Bounded-collection poll (brief 9.1 c): each check reads the whole collection and diffs it with
 * the previous one (`pollSnapshot`, 5000-row cap, which throws naming the cap). The first check
 * records what exists and emits nothing. Without `stampOf` only new records are emitted.
 */
export function snapshotTrigger<P = Record<string, unknown>>(
  spec: SnapshotSpec<P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    async poll({ state, params }, ctx) {
      const items = await spec.load(params, ctx);
      const byId = new Map<string, unknown>();
      for (const item of items) {
        const id = spec.idOf(item);
        if (id) byId.set(id, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId].map(([key, item]) => ({
          key,
          values: spec.stampOf ? { id: key, stamp: spec.stampOf(item) } : { id: key },
        })),
        emit: { added: true, updated: spec.stampOf !== undefined },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}

/** Pages read per check by `loadAll`: 50 pages of 100 is the kit's 5000-row snapshot cap. */
export const MAX_PAGES = 50;
const LIMIT = 100;

interface ListAction {
  execute(input: never, ctx: HookContext): Promise<unknown> | unknown;
}

/**
 * Reads every page of one of the app's own `entries`-shaped list actions (`limit` 100 is the
 * documented maximum, https://docs.sayanchor.com/reference/pagination-filtering). Stops on a short
 * page or when `totalCount` is reached; throws, naming the cap, when the collection is larger
 * than `MAX_PAGES` pages rather than diffing a truncated one.
 */
export async function loadAll(
  action: ListAction,
  input: Record<string, unknown>,
  ctx: HookContext,
): Promise<unknown[]> {
  const items: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const out = await action.execute({ ...input, page, limit: LIMIT } as never, ctx) as {
      entries?: unknown[];
      totalCount?: number;
    };
    const entries = Array.isArray(out.entries) ? out.entries : [];
    items.push(...entries);
    if (entries.length < LIMIT) return items;
    if (typeof out.totalCount === "number" && items.length >= out.totalCount) return items;
  }
  throw new Error(`more than ${MAX_PAGES * LIMIT} records: too many to watch with a snapshot`);
}
