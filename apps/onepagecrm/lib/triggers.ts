import type { ActionDefinition, OutputField } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

/** Params the trigger owns: paging and order are fixed, every other filter stays user-settable. */
const OWNED = new Set(["page", "perPage", "sortBy", "order"]);

export interface RecordFeedSpec {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  /** The key each list item is wrapped under (`{ company: {...} }`). */
  wrapper: string;
  /** `created_at` for a "New …" feed, `modified_at` for "New or Updated …". */
  sortBy: "created_at" | "modified_at";
  sample: unknown;
}

/**
 * One newest-first feed over an OnePageCRM list action (`sort_by` + `order=desc`, 100 per page).
 * A `modified_at` feed keys events by `<id>:<modified_at>` so an edit is a new event.
 */
export function recordFeed(spec: RecordFeedSpec) {
  const updated = spec.sortBy === "modified_at";
  const output: OutputField[] = [
    {
      key: spec.wrapper,
      type: "object",
      label: `${spec.title.replace(/^New (or Updated )?/, "")}`,
    },
  ];
  return pollFromListAction<Record<string, unknown>>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    params: (spec.action.params ?? []).filter((p) => !OWNED.has(p.key)),
    input: (params) => ({ ...params, sortBy: spec.sortBy, order: "desc", page: 1, perPage: 100 }),
    items: (result) => (result as { items?: unknown[] }).items ?? [],
    idOf: (item) => {
      const rec = (item as Record<string, { id?: unknown; modified_at?: unknown } | undefined>)[
        spec.wrapper
      ];
      if (rec?.id === undefined || rec.id === null) {
        throw new Error(`OnePageCRM ${spec.wrapper} has no stable id`);
      }
      return updated ? `${String(rec.id)}:${String(rec.modified_at ?? "")}` : String(rec.id);
    },
    output,
    sample: spec.sample,
    maxPages: 1,
  });
}
