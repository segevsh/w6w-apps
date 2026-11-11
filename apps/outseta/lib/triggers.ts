import type { ActionDefinition, OutputField } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

/** Params the trigger owns: paging, shaping and order are fixed; parent ids and filters stay. */
const OWNED = new Set(["limit", "offset", "fields", "orderBy", "filters"]);

/** Rows per page: Outseta's documented cap (https://docs.outseta.com/api-reference/overview). */
export const PAGE_SIZE = 100;

export interface RecordFeedSpec {
  key: string;
  title: string;
  description: string;
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  output: OutputField[];
  sample: unknown;
}

/**
 * Newest-first feed over an Outseta list action: `orderBy=Created DESC`, ids are the record `Uid`.
 * Any parent id the action needs (`accountUid`, `emailListUid`) stays a required trigger param.
 */
export function recordFeed(spec: RecordFeedSpec) {
  return pollFromListAction<Record<string, unknown>>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    params: (spec.action.params ?? []).filter((p) => !OWNED.has(p.key)),
    input: (params) => ({ ...params, limit: PAGE_SIZE, orderBy: "Created DESC" }),
    items: (result) => (result as { items?: unknown[] }).items ?? [],
    idOf: (item) => {
      const uid = (item as { Uid?: unknown }).Uid;
      if (uid === undefined || uid === null || uid === "") {
        throw new Error(`${spec.key}: Outseta record has no Uid`);
      }
      return String(uid);
    },
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  });
}
