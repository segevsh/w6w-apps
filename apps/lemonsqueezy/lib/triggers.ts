import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Lemon Squeezy's page size maximum (`page[size]` 1-100, docs.lemonsqueezy.com/api/getting-started/requests). */
export const PAGE_SIZE = 100;
/** Pages read per check; a collection wider than this fails loudly instead of being half-read. */
export const MAX_PAGES = 10;

interface ListResult {
  data?: unknown[];
  meta?: { page?: { lastPage?: number } };
}

/**
 * A bounded-collection poll over an EXISTING list action: every check reads the whole collection
 * (up to MAX_PAGES pages of PAGE_SIZE, following `meta.page.lastPage`) through the SAME
 * `action.execute(...)` and diffs the ids with `pollSnapshot` (added only). The first check records
 * what exists and emits nothing. Events are the raw JSON:API resource objects.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(`snapshotTrigger(${spec.key}): action ${spec.action.key} is not a list action`);
  }
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const rows: Array<{ key: string; values: unknown }> = [];
      let page = 1;
      let lastPage = 1;
      do {
        const result = await spec.action.execute(
          { pageNumber: page, pageSize: PAGE_SIZE },
          ctx,
        ) as ListResult;
        for (const item of result.data ?? []) {
          rows.push({ key: String((item as { id?: unknown }).id), values: item });
        }
        lastPage = result.meta?.page?.lastPage ?? 1;
        page++;
      } while (page <= lastPage && page <= MAX_PAGES);
      if (lastPage > MAX_PAGES) {
        throw new Error(
          `${spec.key}: the collection spans ${lastPage} pages, more than the ${
            MAX_PAGES * PAGE_SIZE
          }-record cap`,
        );
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
