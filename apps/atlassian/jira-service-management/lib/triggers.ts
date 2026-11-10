import type { ActionDefinition, HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

const PAGE_SIZE = 100;
export const MAX_PAGES = 5;

interface Page {
  values?: unknown[];
  isLastPage?: boolean;
}

/**
 * A "new X" trigger over one of the app's bounded collections (service desks, organizations): every
 * check reads the whole collection through the existing list action (`start`/`limit` paging, up to
 * `MAX_PAGES` pages) and diffs the ids against the last check (`pollSnapshot`, added only). A
 * collection longer than `MAX_PAGES` pages is a failed check that names the cap, never a silent
 * partial read.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<{ start?: number; limit?: number }>;
  output: TriggerDefinition["output"];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 300_000,
    output: spec.output,
    sample: spec.sample,
    async poll({ state }, ctx: HookContext) {
      const items: Array<Record<string, unknown>> = [];
      let last = false;
      for (let page = 0; page < MAX_PAGES && !last; page++) {
        const res = await spec.action.execute(
          { start: page * PAGE_SIZE, limit: PAGE_SIZE },
          ctx,
        ) as Page;
        items.push(...((res.values ?? []) as Array<Record<string, unknown>>));
        last = res.isLastPage !== false;
      }
      if (!last) {
        throw new Error(
          `${spec.key}: more than ${MAX_PAGES * PAGE_SIZE} rows; the check reads at most ${
            MAX_PAGES * PAGE_SIZE
          }`,
        );
      }
      const byId = new Map(items.filter((i) => i.id != null).map((i) => [String(i.id), i]));
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
