import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";

interface Input {
  reportId: number | string;
  format: "csv" | "json";
  includeInfo?: boolean;
  locale?: string;
  humanReadable?: string;
}

/**
 * `GET /v1/company/reports/{reportId}/download` — a report's data. The endpoint
 * also offers `xlsx`, which is a binary file a workflow step cannot carry, so
 * only `csv` (returned as text) and `json` (parsed) are offered here.
 * `humanReadable` is only honoured when `format` is `json`.
 */
const reportDownload: ActionDefinition<Input> = {
  key: "report-download",
  type: "read",
  resource: "report",
  title: "Download Report",
  description: "Download a company report's data as JSON or CSV text.",
  params: [
    { key: "reportId", label: "Report ID", type: "number", required: true },
    {
      key: "format",
      label: "Format",
      type: "select",
      required: true,
      default: "json",
      options: [
        { value: "json", label: "JSON" },
        { value: "csv", label: "CSV (as text)" },
      ],
    },
    {
      key: "includeInfo",
      label: "Include report name and run date",
      type: "boolean",
      hint: "Bob includes it by default.",
    },
    { key: "locale", label: "Locale", type: "string", hint: "e.g. fr-FR for column names." },
    {
      key: "humanReadable",
      label: "Human-readable values (json only)",
      type: "select",
      options: [
        { value: "", label: "Machine values only" },
        { value: "APPEND", label: "Append humanReadable node" },
        { value: "REPLACE", label: "Replace with human-readable values" },
      ],
    },
  ],
  output: [
    { key: "format", type: "string", label: "Format returned" },
    { key: "data", type: "object", label: "Parsed JSON, or the CSV text" },
  ],

  async execute(input, ctx) {
    const format = input.format || "json";
    if (format !== "csv" && format !== "json") {
      throw new Error(`format must be "csv" or "json", got "${format}"`);
    }
    const data = await new HibobClient(ctx).get(
      `/company/reports/${encodeId(input.reportId)}/download`,
      {
        format,
        includeInfo: input.includeInfo === undefined ? undefined : input.includeInfo,
        locale: input.locale,
        humanReadable: format === "json" ? input.humanReadable || undefined : undefined,
      },
    );
    return { format, data };
  },
};

export default reportDownload;
