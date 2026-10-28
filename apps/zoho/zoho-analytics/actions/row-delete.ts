import type { ActionDefinition } from "@w6w/types";
import { organizationIdFrom, ZohoAnalyticsClient } from "../lib/client.ts";
import { criteria, organizationId, viewId, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  viewId: string;
  criteria?: string;
  deleteAllRows?: boolean;
  organizationId?: string;
}

interface Output {
  deletedRows: number;
}

/**
 * `DELETE /workspaces/<workspace-id>/views/<view-id>/rows` — Delete Row.
 * Needs `ZohoAnalytics.data.delete`. Verified against
 * `data-api/delete-row.html`: either `criteria` or `deleteAllRows: true`
 * must be set. Marked idempotent: deleting rows already gone (a retried
 * call) converges on the same end state — 0 further rows deleted, not an
 * error.
 */
const rowDelete: ActionDefinition<Input, Output> = {
  key: "row-delete",
  type: "perform",
  resource: "row",
  title: "Delete Row",
  description: "Delete rows in a table/view matching a criteria (or every row).",
  idempotent: true,
  params: [
    workspaceId,
    viewId,
    criteria,
    {
      key: "deleteAllRows",
      label: "Delete all rows",
      type: "boolean",
      advanced: true,
      hint: "Delete every row in the table instead of matching a criteria.",
    },
    organizationId,
  ],
  output: [{ key: "deletedRows", type: "number", label: "Rows deleted" }],

  execute(input, ctx) {
    const config: Record<string, unknown> = {};
    if (input.criteria) config.criteria = input.criteria;
    if (input.deleteAllRows !== undefined) config.deleteAllRows = input.deleteAllRows;

    return new ZohoAnalyticsClient(ctx).request<Output>(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/views/${
        encodeURIComponent(input.viewId)
      }/rows`,
      { method: "DELETE", config, organizationId: organizationIdFrom(input, ctx) },
    );
  },
};

export default rowDelete;
