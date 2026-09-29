import type { ActionDefinition } from "@w6w/types";
import { organizationIdFrom, ZohoAnalyticsClient } from "../lib/client.ts";
import { organizationId, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  file: unknown;
  tableName: string;
  fileType: "csv" | "json";
  autoIdentify: boolean;
  onError?: "abort" | "skiprow" | "setcolumnempty";
  skipTop?: number;
  organizationId?: string;
}

interface Output {
  viewId: string;
  importSummary: Record<string, unknown>;
  columnDetails: Record<string, unknown>;
  importErrors: string;
}

/**
 * `POST /workspaces/<workspace-id>/data` — Import Data (creates a new
 * table). Needs `ZohoAnalytics.data.create`. Verified against
 * `bulk-api/import-data/new-table.html`: `multipart/form-data` with a
 * `FILE` field, and the rest of the config (`tableName`, `fileType`,
 * `autoIdentify`, ...) riding the `CONFIG` query parameter alongside it —
 * not the multipart body. Max file size is 20 MB (vendor-documented).
 *
 * Only the core fields are exposed here (`tableName`, `fileType`,
 * `autoIdentify`, `onError`, `skipTop`) — the CSV-specific
 * (`commentChar`/`delimiter`/`quoted`, mandatory only when `autoIdentify`
 * is false) and JSON-specific (`retainColumnNames`) attributes, plus
 * importing into an *existing* table, are deliberately left out as not
 * core to workflow automation of a single new-table import.
 */
const dataImportNewTable: ActionDefinition<Input, Output> = {
  key: "data-import-new-table",
  type: "perform",
  resource: "table",
  title: "Import Data (New Table)",
  description: "Upload a CSV or JSON file and create a new table from it.",
  idempotent: false,
  params: [
    workspaceId,
    {
      key: "file",
      label: "File",
      type: "file",
      required: true,
      hint: "CSV or JSON. Max 20MB.",
    },
    { key: "tableName", label: "Table name", type: "string", required: true },
    {
      key: "fileType",
      label: "File type",
      type: "select",
      required: true,
      options: [
        { value: "csv", label: "CSV" },
        { value: "json", label: "JSON" },
      ],
    },
    {
      key: "autoIdentify",
      label: "Auto-identify format",
      type: "boolean",
      default: true,
      hint: "Let Zoho Analytics detect the CSV delimiter/quoting automatically.",
    },
    {
      key: "onError",
      label: "On row error",
      type: "select",
      advanced: true,
      options: [
        { value: "abort", label: "Abort the whole import" },
        { value: "skiprow", label: "Skip the problem row(s)" },
        { value: "setcolumnempty", label: "Set the errored column to empty" },
      ],
    },
    {
      key: "skipTop",
      label: "Skip top rows",
      type: "number",
      advanced: true,
      hint: "Number of rows to skip from the top of the file before importing.",
    },
    organizationId,
  ],
  output: [
    { key: "viewId", type: "string", label: "New table's view ID" },
    { key: "importSummary", type: "object", label: "Import summary" },
    { key: "columnDetails", type: "object", label: "Column type details" },
    { key: "importErrors", type: "string", label: "Import errors, if any" },
  ],

  execute(input, ctx) {
    const config: Record<string, unknown> = {
      tableName: input.tableName,
      fileType: input.fileType,
      autoIdentify: input.autoIdentify,
    };
    if (input.onError) config.onError = input.onError;
    if (input.skipTop !== undefined) config.skipTop = input.skipTop;

    const form = new FormData();
    // `input.file` arrives as whatever the host's `file` param resolves to
    // (a Blob/File in the reference runtime); FormData accepts it directly.
    form.append("FILE", input.file as Blob);

    return new ZohoAnalyticsClient(ctx).request<Output>(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/data`,
      { method: "POST", config, form, organizationId: organizationIdFrom(input, ctx) },
    );
  },
};

export default dataImportNewTable;
