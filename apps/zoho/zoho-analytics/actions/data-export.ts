import type { ActionDefinition } from "@w6w/types";
import { organizationIdFrom, ZohoAnalyticsClient } from "../lib/client.ts";
import { criteria, organizationId, viewId, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  viewId: string;
  responseFormat: "csv" | "json" | "xml" | "html";
  criteria?: string;
  selectedColumns?: unknown;
  includeHeader?: boolean;
  organizationId?: string;
}

interface Output {
  content: string;
  contentType: string;
}

/**
 * `GET /workspaces/<workspace-id>/views/<view-id>/data` — Export Data.
 * Needs `ZohoAnalytics.data.read`. Verified against
 * `bulk-api/export-data.html`: unlike every other action in this app, a
 * successful response is NOT the `{status,summary,data}` envelope — it
 * streams the view's own data in the requested `responseFormat`
 * (`Content-Type: text/csv`, `application/json`, etc), so this action goes
 * through `ZohoAnalyticsClient#requestRaw` and returns the raw body.
 *
 * The docs also support `xls`, `pdf` and `image` formats (binary), which
 * `requestRaw` would base64-encode — left out of this action's `select`
 * options because a workflow consuming binary export output as a plain
 * string is an unlikely and untested shape; `csv`/`json`/`xml`/`html`
 * cover the text-based, directly-usable cases.
 *
 * The vendor docs also note Export Data is restricted for tables over one
 * million rows, tables/views from live-connect workspaces, and Dashboard/
 * QueryTable view types — those need the Asynchronous Export API instead,
 * which this app does not implement (left out per the "leave it out and
 * say so" rule rather than guessed at).
 */
const dataExport: ActionDefinition<Input, Output> = {
  key: "data-export",
  type: "read",
  resource: "row",
  title: "Export Data",
  description: "Export a table/view's data as CSV, JSON, XML or HTML. Not available for tables " +
    "over 1M rows, live-connect workspaces, or Dashboard/QueryTable views — use Zoho's " +
    "Asynchronous Export API for those (not implemented by this app).",
  params: [
    workspaceId,
    viewId,
    {
      key: "responseFormat",
      label: "Format",
      type: "select",
      required: true,
      default: "csv",
      options: [
        { value: "csv", label: "CSV" },
        { value: "json", label: "JSON" },
        { value: "xml", label: "XML" },
        { value: "html", label: "HTML" },
      ],
    },
    criteria,
    {
      key: "selectedColumns",
      label: "Selected columns",
      type: "json",
      advanced: true,
      hint: 'JSON array of column names to export, e.g. ["Region","Sales"]. Omit for every column.',
    },
    {
      key: "includeHeader",
      label: "Include header row (CSV)",
      type: "boolean",
      advanced: true,
      default: true,
    },
    organizationId,
  ],
  output: [
    { key: "content", type: "string", label: "Exported content" },
    { key: "contentType", type: "string", label: "Response content type" },
  ],

  async execute(input, ctx) {
    const config: Record<string, unknown> = { responseFormat: input.responseFormat };
    if (input.criteria) config.criteria = input.criteria;
    if (input.selectedColumns !== undefined) config.selectedColumns = input.selectedColumns;
    if (input.includeHeader !== undefined) config.includeHeader = input.includeHeader;

    const { content, contentType } = await new ZohoAnalyticsClient(ctx).requestRaw(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/views/${
        encodeURIComponent(input.viewId)
      }/data`,
      { config, organizationId: organizationIdFrom(input, ctx) },
    );
    return { content, contentType };
  },
};

export default dataExport;
