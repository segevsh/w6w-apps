import type { ActionDefinition, OutputField } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

export interface RecordFeedSpec {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  output: OutputField[];
  sample: unknown;
}

/**
 * Newest-first feed over a Pennylane v2 list action: `sort=-id` (ids are issued ascending, `-`
 * prefix = descending; https://pennylane.readme.io `using-cursor-based-pagination`), 100 per page.
 */
export function recordFeed(spec: RecordFeedSpec) {
  return pollFromListAction({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    input: () => ({ sort: "-id", limit: 100 }),
    items: (r) => (r as { items?: unknown[] }).items ?? [],
    idOf: (x) => {
      const id = (x as { id?: unknown }).id;
      if (id === undefined || id === null) throw new Error(`${spec.key}: record has no id`);
      return String(id);
    },
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    maxPages: 1,
  });
}
