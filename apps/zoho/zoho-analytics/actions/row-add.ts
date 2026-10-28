import type { ActionDefinition } from "@w6w/types";
import { organizationIdFrom, parseJsonObject, ZohoAnalyticsClient } from "../lib/client.ts";
import { dateFormatParams, organizationId, viewId, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  viewId: string;
  columns: unknown;
  dateFormat?: string;
  columnDateFormat?: unknown;
  organizationId?: string;
}

interface Output {
  addedColumns: Record<string, unknown>;
  invalidColumns: Record<string, unknown>;
}

/**
 * `POST /workspaces/<workspace-id>/views/<view-id>/rows` — Add Row. Needs
 * `ZohoAnalytics.data.create`. Verified against `data-api/add-row.html`:
 * the whole payload rides the `CONFIG` query parameter (a JSON object of
 * `columns`, plus the optional date-format fields), not a JSON request
 * body — the POST body itself is empty.
 */
const rowAdd: ActionDefinition<Input, Output> = {
  key: "row-add",
  type: "perform",
  resource: "row",
  title: "Add Row",
  description: "Add a single row to a table/view. `columns` is column name -> value, e.g. " +
    '{ "Region": "East", "Sales": 1000 }.',
  idempotent: false,
  params: [
    workspaceId,
    viewId,
    {
      key: "columns",
      label: "Columns",
      type: "json",
      required: true,
      hint: 'JSON object of column name -> value, e.g. { "Region": "East", "Sales": 1000 }.',
    },
    ...dateFormatParams,
    organizationId,
  ],
  output: [
    { key: "addedColumns", type: "object", label: "Added columns" },
    { key: "invalidColumns", type: "object", label: "Invalid columns (rejected)" },
  ],

  execute(input, ctx) {
    const config: Record<string, unknown> = {
      columns: parseJsonObject(input.columns, "columns"),
    };
    if (input.dateFormat) config.dateFormat = input.dateFormat;
    if (input.columnDateFormat) {
      config.columnDateFormat = parseJsonObject(
        input.columnDateFormat,
        "columnDateFormat",
      );
    }

    return new ZohoAnalyticsClient(ctx).request<Output>(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/views/${
        encodeURIComponent(input.viewId)
      }/rows`,
      { method: "POST", config, organizationId: organizationIdFrom(input, ctx) },
    );
  },
};

export default rowAdd;
