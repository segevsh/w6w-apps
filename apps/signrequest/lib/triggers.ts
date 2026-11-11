import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

const PAGE_LIMIT = 100;
/** Pages read per check (2 000 rows); a larger collection fails loudly instead of truncating. */
const MAX_PAGES = 20;

interface Page {
  results?: unknown[];
  next?: string | null;
}

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  /** The EXISTING list action (`GET /<collection>/`, `{ results, next }` envelope). */
  action: ActionDefinition<never>;
  idOf(item: unknown): string;
  output: OutputField[];
  sample: unknown;
}

/**
 * Shape (c): a small bounded collection (a team's templates, members, teams). Every check reads the
 * whole collection, `page=N&limit=100` until `next` is empty, and `pollSnapshot` emits the ids
 * that were not there last time. The seed stores hashes and emits nothing.
 */
export function signrequestSnapshot(spec: SnapshotSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 300_000,
    output: spec.output,
    sample: spec.sample,
    async poll({ state }, ctx) {
      const rows: Array<{ key: string; values: unknown }> = [];
      for (let page = 1;; page++) {
        if (page > MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${
              MAX_PAGES * PAGE_LIMIT
            } records; the collection is too large for a snapshot`,
          );
        }
        const res = await (spec.action.execute as (i: unknown, c: unknown) => Promise<Page>)(
          { page, limit: PAGE_LIMIT },
          ctx,
        );
        for (const item of res.results ?? []) {
          const key = spec.idOf(item);
          if (key) rows.push({ key, values: item });
        }
        if (!res.next) break;
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
