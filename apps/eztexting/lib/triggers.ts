import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

type Item = Record<string, unknown>;
type PageResult = { content?: Item[] | null; totalPages?: number | null };

/** The vendor's largest page (`size` is one of 10/20/50/100/200) and the pages walked per check. */
const PAGE_SIZE = "200";
const MAX_PAGES = 25;

/**
 * A small collection with no documented sortable creation stamp (contact groups, keywords): every
 * check walks the list (`page` 0.., `size=200`) and diffs the ids against the previous check
 * (`pollSnapshot`, additions only; the first check records what exists without firing). A
 * collection longer than {@link MAX_PAGES} pages fails the check rather than reporting a partial
 * snapshot, which would later announce old records as new.
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
      for (let page = 0;; page++) {
        const res = await action.execute({ page, size: PAGE_SIZE }, ctx) as PageResult;
        for (const it of res.content ?? []) {
          const id = String(it.id ?? "");
          if (id) byId.set(id, it);
        }
        const total = Number(res.totalPages ?? 1);
        if (page + 1 >= total) break;
        if (page + 1 >= MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${MAX_PAGES} pages; refusing a partial snapshot`,
          );
        }
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
