import type { ActionDefinition } from "@w6w/types";
import { NocoDBClient } from "../lib/client.ts";

/**
 * `GET /api/v2/meta/tables/{tableId}/views` — the saved filters and sorts a
 * table has.
 *
 * ## A view is a query somebody already wrote
 *
 * "Open orders", "This week's signups", "Rows that need review" — the filters
 * are already defined, maintained by whoever owns the table. Passing a
 * `viewId` to `record-list` uses them, which is usually better than
 * reimplementing the same conditions in a workflow where nobody will update
 * them.
 *
 * The catch, and it is in `record-list` too: a `where` on top of a view is
 * *added* to the view's filters rather than replacing them.
 *
 * ## Shared views are public URLs
 *
 * A view with a share enabled serves its rows to anybody with the link, with
 * no login. That is a deliberate feature and it is also table data on an
 * unauthenticated URL, so this counts them.
 *
 * ## The view type changes what the rows mean
 *
 * A grid returns rows; a kanban groups them by a column; a calendar is
 * organised by a date field. `record-list` returns rows regardless — the
 * grouping is a property of the interface, not of the data — which is worth
 * knowing before a workflow expects a kanban's columns to come back.
 */
const action: ActionDefinition = {
  key: "view-list",
  type: "read",
  resource: "view",
  title: "List views",
  description:
    "A table's saved filters and sorts — queries somebody already wrote and maintains, which is " +
    "usually better than reimplementing them in a workflow. Counts SHARED views, which serve " +
    "their rows to anybody with the link.",
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "views", type: "array", label: "The views" },
    { key: "count", type: "number", label: "How many" },
    { key: "titles", type: "array", label: "Just the names" },
    { key: "byTitle", type: "object", label: "Title to view id, for `record-list`" },
    { key: "sharedViews", type: "array", label: "Served publicly, with no login" },
    { key: "defaultViewId", type: "string", label: "The one the table opens on" },
    { key: "types", type: "object", label: "How many views of each type" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    const body = await new NocoDBClient(ctx).request<{
      list?: Array<{
        id?: string;
        title?: string;
        type?: number;
        is_default?: boolean;
        uuid?: string | null;
        lock_type?: string;
      }>;
    }>(`/api/v2/meta/tables/${encodeURIComponent(tableId)}/views`);

    const views = body?.list ?? [];
    // NocoDB numbers its view types; the names are the interface's.
    const TYPE_NAMES: Record<string, string> = {
      "1": "grid",
      "2": "gallery",
      "3": "form",
      "4": "kanban",
      "5": "map",
      "6": "calendar",
    };

    const byTitle: Record<string, string> = {};
    const types: Record<string, number> = {};
    for (const view of views) {
      if (view?.title && view?.id) byTitle[view.title] = view.id;
      const name = TYPE_NAMES[String(view?.type)] ?? "other";
      types[name] = (types[name] ?? 0) + 1;
    }

    // A shared view is table data on an unauthenticated URL.
    const sharedViews = views
      .filter((view) => Boolean(view?.uuid))
      .map((view) => view?.title)
      .filter(Boolean);
    if (sharedViews.length) {
      ctx.log(
        "warn",
        "some views are shared publicly — their rows are served to anybody with the link, with " +
          "no login",
        { count: sharedViews.length },
      );
    }

    return {
      views: views.map((view) => ({
        id: view?.id,
        title: view?.title,
        type: TYPE_NAMES[String(view?.type)] ?? String(view?.type ?? ""),
        isDefault: view?.is_default === true,
        isShared: Boolean(view?.uuid),
        lockType: view?.lock_type,
      })),
      count: views.length,
      titles: views.map((view) => view?.title).filter(Boolean),
      byTitle,
      sharedViews,
      defaultViewId: views.find((view) => view?.is_default === true)?.id,
      types,
    };
  },
};

export default action;
