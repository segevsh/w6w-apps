import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Pages read per check; a queue holds at most 1 000 posts (20 per page), so 50 pages is the ceiling. */
const MAX_PAGES = 50;
const PAGE_SIZE = 20;

export interface OffsetSnapshotSpec {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params: Param[];
  /** Response field holding the array (`posts`). */
  itemsKey: string;
  /** Whether the vendor documents `limit` for this endpoint (the submission list does not). */
  limit: boolean;
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}

type Execute = (input: unknown, ctx: unknown) => Promise<Record<string, unknown>>;

/**
 * Shape (c): a bounded collection read by `offset` (the queue is capped at 1 000 posts; submissions
 * await review). Every check reads pages until one comes back empty (or short, when `limit` is
 * documented) and `pollSnapshot` emits the post ids not seen before; the seed emits nothing.
 */
export function tumblrOffsetSnapshot(spec: OffsetSnapshotSpec): TriggerDefinition<{
  blogIdentifier: string;
}> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 900_000,
    async poll({ params, state }, ctx) {
      const rows: Array<{ key: string; values: unknown }> = [];
      let offset = 0;
      for (let page = 0;; page++) {
        if (page >= MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${MAX_PAGES} pages of posts; refusing to truncate`,
          );
        }
        const res = await (spec.action.execute as Execute)(
          spec.limit
            ? { blogIdentifier: params.blogIdentifier, limit: PAGE_SIZE, offset }
            : { blogIdentifier: params.blogIdentifier, offset },
          ctx,
        );
        const got = Array.isArray(res?.[spec.itemsKey]) ? res[spec.itemsKey] as unknown[] : [];
        for (const item of got) {
          const id = String((item as { id?: unknown }).id ?? "");
          if (id) rows.push({ key: id, values: item });
        }
        offset += got.length;
        if (got.length === 0 || (spec.limit && got.length < PAGE_SIZE)) break;
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
