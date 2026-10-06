import type { ActionDefinition } from "@w6w/types";
import { compact, DiffbotClient } from "../lib/client.ts";
import { dropCsvColumns } from "../lib/csv.ts";

interface Input {
  name: string;
  format?: string;
  type?: string;
  num?: number;
}

/**
 * `GET /v3/crawl/data` — the extracted results of a job. Every JSON record the
 * vendor returns carries a `token` field ("Your token"); it is stripped here so a
 * run record never holds the credential.
 */
const crawlDataGet: ActionDefinition<Input> = {
  key: "crawl-data-get",
  type: "read",
  resource: "crawl",
  title: "Get Crawl Data",
  description: "Download the extracted records of a crawl job (JSON, or CSV of top-level " +
    "fields), or its URL report. The token the vendor includes in each record is removed.",
  params: [
    { key: "name", label: "Job name", type: "string", required: true },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "json",
      options: [
        { value: "json", label: "JSON (full records)" },
        { value: "csv", label: "CSV (top-level fields only)" },
      ],
    },
    {
      key: "type",
      label: "Report",
      type: "select",
      options: [{ value: "urls", label: "URL report — a CSV diagnostic of every URL crawled" }],
      hint: "Leave empty for the extracted data.",
    },
    {
      key: "num",
      label: "Most recent N records",
      type: "number",
      hint: "Subset of URLs, most recently processed first. Leave empty for all.",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "count", type: "number", label: "Records returned (JSON only)" },
    { key: "records", type: "array", label: "Extracted records (JSON only)" },
    {
      key: "csv",
      type: "string",
      label: "CSV text (CSV format or URL report; any token column removed)",
    },
  ],

  async execute(input, ctx) {
    const { body } = await new DiffbotClient(ctx).request("/v3/crawl/data", {
      query: compact({
        name: input.name.trim(),
        format: input.format === "csv" ? "csv" : undefined,
        type: input.type === "urls" ? "urls" : undefined,
        num: input.num,
      }) as Record<string, string | number>,
    });
    if (body === undefined) return { count: 0, records: [], csv: undefined };
    if (typeof body !== "object") {
      return { count: 0, records: [], csv: dropCsvColumns(String(body), ["token"]) };
    }
    const list = Array.isArray(body) ? body : [];
    const records = list.map((r) => {
      if (!r || typeof r !== "object") return r;
      const { token: _token, ...rest } = r as Record<string, unknown>;
      return rest;
    });
    return { count: records.length, records, csv: undefined };
  },
};

export default crawlDataGet;
