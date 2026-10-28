import type { ActionDefinition } from "@w6w/types";
import { organizationIdFrom, parseJsonObject, ZohoAnalyticsClient } from "../lib/client.ts";
import { criteria, dateFormatParams, organizationId, viewId, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  viewId: string;
  columns: unknown;
  criteria?: string;
  updateAllRows?: boolean;
  addIfNotExist?: boolean;
  dateFormat?: string;
  columnDateFormat?: unknown;
  organizationId?: string;
}

interface Output {
  updatedColumns: Record<string, unknown>;
  updatedRows: number;
  invalidColumns: Record<string, unknown>;
}

/**
 * `PUT /workspaces/<workspace-id>/views/<view-id>/rows` — Update Row. Needs
 * `ZohoAnalytics.data.update`. Verified against `data-api/update-row.html`:
 * either `criteria` or `updateAllRows: true` must be set, or Zoho answers
 * `400 {"errorCode":8504,...}` ("required parameter ... has not been
 * sent") — left to the vendor's own validation rather than duplicated here.
 * Marked idempotent: re-sending the same criteria+columns converges on the
 * same end state, the same way `zohobooks`' `contact-update` is.
 */
const rowUpdate: ActionDefinition<Input, Output> = {
  key: "row-update",
  type: "perform",
  resource: "row",
  title: "Update Row",
  description: "Update rows in a table/view matching a criteria (or every row). `columns` is " +
    'column name -> new value, e.g. { "Region": "East" }.',
  idempotent: true,
  params: [
    workspaceId,
    viewId,
    {
      key: "columns",
      label: "Columns",
      type: "json",
      required: true,
      hint: 'JSON object of column name -> new value, e.g. { "Region": "East" }.',
    },
    criteria,
    {
      key: "updateAllRows",
      label: "Update all rows",
      type: "boolean",
      advanced: true,
      hint: "Update every row in the table instead of matching a criteria.",
    },
    {
      key: "addIfNotExist",
      label: "Add if no row matches",
      type: "boolean",
      advanced: true,
      default: false,
      hint: "Add a new row with these columns when the criteria matches nothing.",
    },
    ...dateFormatParams,
    organizationId,
  ],
  output: [
    { key: "updatedColumns", type: "object", label: "Updated columns" },
    { key: "updatedRows", type: "number", label: "Rows updated" },
    { key: "invalidColumns", type: "object", label: "Invalid columns (rejected)" },
  ],

  execute(input, ctx) {
    const config: Record<string, unknown> = {
      columns: parseJsonObject(input.columns, "columns"),
    };
    if (input.criteria) config.criteria = input.criteria;
    if (input.updateAllRows !== undefined) config.updateAllRows = input.updateAllRows;
    if (input.addIfNotExist !== undefined) config.addIfNotExist = input.addIfNotExist;
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
      { method: "PUT", config, organizationId: organizationIdFrom(input, ctx) },
    );
  },
};

export default rowUpdate;
