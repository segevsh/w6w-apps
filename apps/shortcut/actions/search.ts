import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient, toStringList } from "../lib/client.ts";
import { searchDetailOptions, searchEntityTypeOptions } from "../lib/params.ts";

/**
 * `GET /api/v3/search` — free-text search across Stories, Epics, Iterations
 * and Milestones/Objectives in one query, using Shortcut's search-string syntax
 * (e.g. `is:story owner:jane state:started "bug in checkout"`).
 *
 * Cursor-paged: the response's `next` field, when present, is a full URL path
 * plus query string for the next page. This action exposes `next` as an input
 * so a workflow can pass a previous call's own `next` straight back in; the
 * value is used verbatim as the query string, replacing the other params on
 * that call.
 */
interface Input {
  query: string;
  entityTypes?: string | string[];
  detail?: string;
  pageSize?: number;
  next?: string;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search",
  description: "Free-text search across Stories, Epics, Iterations and Objectives.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: 'Shortcut search syntax, e.g. `is:story owner:jane state:started "checkout bug"`.',
    },
    {
      key: "entityTypes",
      label: "Entity types",
      type: "multiselect",
      options: searchEntityTypeOptions,
      hint: "Leave empty to search every entity type.",
    },
    { key: "detail", label: "Detail", type: "select", options: searchDetailOptions },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1 },
    },
    {
      key: "next",
      label: "Next-page cursor",
      type: "string",
      hint: "Paste the `next` value from a previous call's response to fetch the next page.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Search results, grouped by entity type" }],

  execute(input, ctx) {
    if (input.next) {
      // `next` is already a full path+query string (e.g.
      // "/api/v3/search?...&next=..."); the client's own /api/v3 prefix would
      // double up, so it is stripped before reusing `get`.
      const path = input.next.replace(/^\/api\/v3/, "");
      return new ShortcutClient(ctx).get(path);
    }
    return new ShortcutClient(ctx).get(
      "/search",
      compact({
        query: input.query,
        entity_types: toStringList(input.entityTypes),
        detail: input.detail,
        page_size: input.pageSize,
      }),
    );
  },
};

export default search;
