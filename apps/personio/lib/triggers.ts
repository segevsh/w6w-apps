import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";

/**
 * Brief 9.1(b) since-filter poll: every check calls the wrapped list action with the vendor's
 * created/updated-after filter set to `cursor - overlap`, then de-duplicates by id. The state
 * keeps the cursor beside the seen ids; the first check records the cursor and emits nothing.
 */
export const clock = { now: (): number => Date.now() };
const OVERLAP_MS = 600_000;
const MAX_PAGES = 5;

export interface SinceSpec<T, P> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** Calls the wrapped list action with the filter bound; `page` is the previous page's token. */
  load(
    args: { from: string; params: P; page?: string },
    ctx: HookContext,
  ): Promise<{ items: T[]; next?: string }>;
  idOf(item: T): string;
  /** Drop items the filter returns but this trigger must not emit (e.g. edited, not created). */
  keep?(item: T, from: string): boolean;
}

export function sinceFilterTrigger<T, P = Record<string, unknown>>(
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
    async poll({ params, state }, ctx) {
      const now = clock.now();
      const prior = state as { cursor?: unknown } | null;
      const cursor = typeof prior?.cursor === "number" ? prior.cursor : now;
      const from = new Date(cursor - OVERLAP_MS).toISOString();
      let truncated = false;
      const { events, nextState } = await pollNewItems<T>({
        state,
        maxPages: 1,
        maxEvents: 500,
        seenWindow: 1000,
        idOf: spec.idOf,
        async fetchPage() {
          const items: T[] = [];
          let page: string | undefined;
          for (let n = 0; n < MAX_PAGES; n++) {
            const res = await spec.load({ from, params, page }, ctx);
            items.push(...res.items);
            page = res.next;
            if (page === undefined) break;
            if (n === MAX_PAGES - 1) truncated = true;
          }
          return { items: spec.keep ? items.filter((i) => spec.keep!(i, from)) : items };
        },
      });
      // A truncated read keeps the old cursor so the unread tail is re-read (ids dedupe).
      return { events, nextState: { ...nextState, cursor: truncated ? cursor : now } };
    },
  };
}

export interface Employee {
  id?: number | string;
  created_at?: string;
  last_modified_at?: string;
  [attribute: string]: unknown;
}

/**
 * Page loader for the `list-employees` action with `updatedSince` bound to the cursor window.
 * With `updated_since` Personio ignores `limit`/`offset` and returns every match unpaginated,
 * so there is never a second page.
 */
export function employeesSince(action: ActionDefinition) {
  return async (
    { from }: { from: string; params: unknown; page?: string },
    ctx: HookContext,
  ): Promise<{ items: Employee[]; next?: string }> => {
    const res = await action.execute({ updatedSince: from.slice(0, 19) }, ctx) as {
      employees?: Employee[];
    };
    return { items: res.employees ?? [] };
  };
}
