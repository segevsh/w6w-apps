import type { Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** A Capsule page is at most 100 entities (`perPage` 1-100, https://developer.capsulecrm.com/v2/). */
const PER_PAGE = 100;
/** Bounded collections only (pipelines, milestones, users): 10 pages = 1000 records. */
const MAX_PAGES = 10;

interface Page {
  rows: Array<Record<string, unknown>>;
  nextPage?: number;
}

/**
 * "New <record>" for a small, bounded Capsule collection (a account's users, pipelines, or one
 * pipeline's milestones): every check reads the whole collection through the SAME list action and
 * diffs the ids (`pollSnapshot`, added only).
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: TriggerDefinition["output"];
  sample: unknown;
  /** One page of the list action; `page` is undefined for an unpaged list. */
  load(params: Record<string, unknown>, page: number, ctx: never): Promise<Page>;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 300_000,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    async poll({ params, state }, ctx) {
      const byId = new Map<string, Record<string, unknown>>();
      let page: number | undefined = 1;
      for (let n = 0; page !== undefined; n++) {
        if (n >= MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${MAX_PAGES * PER_PAGE} records in the collection`,
          );
        }
        const res: Page = await spec.load(params, page, ctx as never);
        for (const row of res.rows) byId.set(String(row.id), row);
        page = res.nextPage;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}

export const PAGE_SIZE = PER_PAGE;
