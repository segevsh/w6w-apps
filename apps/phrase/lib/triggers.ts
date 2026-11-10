import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollWindow } from "./window.ts";

/**
 * Brief 9.1(b) since-filter poll: every check calls the wrapped list action with the vendor's
 * created/updated-after filter set to `cursor - overlap`, then de-duplicates by id. The state
 * keeps the cursor beside the seen ids; the first check reads nothing and floors at `now`; a window of more than MAX_PAGES pages
 * resumes by page next check.
 */
export const clock = { now: (): number => Date.now() };
const OVERLAP_MS = 600_000;
const MAX_PAGES = 5;
const PAGE_SIZE = 100;

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
  /** Creation/update time (ms) the filter compares; drives the seed floor (brief 9.9). */
  tsOf(item: T): number | undefined;
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
    poll({ params, state }, ctx) {
      return pollWindow<T, string>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: 1000,
        idOf: spec.idOf,
        tsOf: spec.tsOf,
        // `updated_since` has no upper bound: an arrival while the window drains can only push
        // records to a LATER page (a re-read, deduped by the seen ids), never skip one.
        async load(since, page) {
          const from = new Date(since).toISOString();
          const res = await spec.load({ from, params, page }, ctx);
          return {
            items: spec.keep ? res.items.filter((i) => spec.keep!(i, from)) : res.items,
            next: res.next,
          };
        },
      });
    },
  };
}

export interface Job {
  id?: string;
  name?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
}

export const jobTriggerParams: Param[] = [
  {
    key: "projectId",
    label: "Project ID",
    type: "string",
    required: true,
    hint: "Phrase Strings project id (from List Projects, or the project URL).",
  },
];

/** Page loader for the `job-list` action with `updatedSince` bound to the cursor window. */
export function jobsSince(action: ActionDefinition) {
  return async (
    { from, params, page }: { from: string; params: { projectId: string }; page?: string },
    ctx: HookContext,
  ): Promise<{ items: Job[]; next?: string }> => {
    const res = await action.execute({
      projectId: params.projectId,
      updatedSince: from,
      page: page === undefined ? 1 : Number(page),
      perPage: 100,
    }, ctx) as { items?: Job[]; nextPage?: number | null };
    return { items: res.items ?? [], next: res.nextPage ? String(res.nextPage) : undefined };
  };
}
