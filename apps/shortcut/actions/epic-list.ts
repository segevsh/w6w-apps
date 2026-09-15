import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";

/**
 * `GET /api/v3/epics/paginated` — Epics, page by page.
 *
 * Shortcut also documents a plain `GET /api/v3/epics` that returns every Epic
 * in one unbounded array; this action uses the paginated form instead so a
 * workspace with a large backlog doesn't hand a workflow step an unbounded
 * response. Raise `pageSize` explicitly when you mean to.
 */
interface Input {
  page?: number;
  pageSize?: number;
  includesDescription?: boolean;
}

const epicList: ActionDefinition<Input> = {
  key: "epic-list",
  type: "search",
  resource: "epic",
  title: "List Epics",
  description: "List Epics, page by page.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1 },
    },
    {
      key: "includesDescription",
      label: "Include description",
      type: "boolean",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Epics on this page" },
    { key: "next", type: "number", label: "The next page number, or null for the last page" },
    { key: "total", type: "number", label: "Total Epics across all pages" },
  ],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(
      "/epics/paginated",
      compact({
        page: input.page,
        page_size: input.pageSize,
        includes_description: input.includesDescription,
      }),
    );
  },
};

export default epicList;
