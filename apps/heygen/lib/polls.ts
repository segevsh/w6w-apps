import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * Bounded-snapshot poll over one of the app's own cursor-paginated list actions.
 *
 * HeyGen's list endpoints page with `limit` + an opaque `token` and answer `has_more` /
 * `next_token` beside `data` (https://developers.heygen.com/reference/list-templates , verified
 * 2026-11-10). A check follows the token through at most `maxPages` pages of the action; a
 * collection still `has_more` after that fails the check (a visible error) instead of diffing a
 * partial list, which would report rows drifting in and out of the window as new ones. Only the
 * rows that were not there at the previous check are emitted; the first check only records them.
 */
export interface PagedSnapshotSpec<I> {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<I>;
  /** The literal action input for one page (`token` undefined = the first page). */
  input(token: string | undefined): I;
  maxPages: number;
  output: OutputField[];
  sample: unknown;
}

interface ActionPage {
  items?: Array<Record<string, unknown>>;
  hasMore?: boolean;
  nextToken?: string | null;
}

export function pagedSnapshotTrigger<I>(spec: PagedSnapshotSpec<I>): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const rows: Array<{ key: string; values: Record<string, unknown> }> = [];
      let token: string | undefined;
      for (let page = 1;; page++) {
        const out = await spec.action.execute(spec.input(token), ctx) as ActionPage;
        for (const item of out?.items ?? []) {
          if (typeof item?.id === "string" && item.id !== "") {
            rows.push({ key: item.id, values: item });
          }
        }
        if (!out?.hasMore) break;
        if (!out.nextToken || page >= spec.maxPages) {
          throw new Error(
            `${spec.title}: HeyGen still has more rows after ${page} page(s), so the list cannot be tracked reliably.`,
          );
        }
        token = out.nextToken;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false, removed: false },
        maxRows: 5000,
      });
      return { events: events.map((c) => c.values), nextState };
    },
  };
}
