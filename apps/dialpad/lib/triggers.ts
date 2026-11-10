import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

type Item = Record<string, unknown>;
type Page = { cursor?: string | null; items?: Item[] | null };

/** Safety bound on cursor pages walked in one check; a larger collection is refused, never truncated. */
const MAX_PAGES = 100;

/**
 * Dialpad list endpoints take a `cursor` and document no sort order and no created/updated filter
 * (https://developers.dialpad.com/docs/pagination), so "new <record>" is a snapshot of the whole
 * collection: every check walks the cursor chain to its end and diffs the ids against the previous
 * check (`pollSnapshot`, additions only; the first check records what exists without firing).
 * A partial walk would later report old records as added, so a collection longer than
 * {@link MAX_PAGES} pages fails the check instead.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: unknown;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const action = spec.action as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const byId = new Map<string, Item>();
      let cursor: string | undefined;
      for (let n = 0;; n++) {
        if (n >= MAX_PAGES) {
          throw new Error(`${spec.key}: more than ${MAX_PAGES} pages; refusing a partial snapshot`);
        }
        const page = await action.execute(cursor ? { cursor } : {}, ctx) as Page;
        for (const it of page.items ?? []) {
          const id = String(it.id ?? "");
          if (id) byId.set(id, it);
        }
        if (!page.cursor) break;
        cursor = page.cursor;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key) as Item), nextState };
    },
  };
}
