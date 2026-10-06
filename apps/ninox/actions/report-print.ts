import type { ActionDefinition } from "@w6w/types";
import { asIds, asRecordId, NinoxClient, seg } from "../lib/client.ts";

/**
 * `POST /workspace/{workspaceId}/reports/{reportId}/print` — renders a PDF and returns a
 * presigned download URL. `rowId` plus `rowIds` may not exceed 250 records.
 */
interface Input {
  reportId: string;
  rowId: number | string;
  rowIds?: number[] | string;
}

interface Output {
  fileName?: string;
  mimeType?: string;
  url?: string;
}

const reportPrint: ActionDefinition<Input, Output> = {
  key: "report-print",
  type: "perform",
  resource: "report",
  title: "Print Report",
  description: "Render a report for a record (or a merged run over several) as a PDF and return " +
    "a presigned download URL.",
  idempotent: true,
  params: [
    { key: "reportId", label: "Report ID", type: "string", required: true },
    { key: "rowId", label: "Record ID", type: "number", required: true },
    {
      key: "rowIds",
      label: "Additional record IDs",
      type: "string",
      hint: "Comma-separated ids merged into the same document (at most 249 more).",
    },
  ],
  output: [
    { key: "fileName", type: "string", label: "Rendered file name" },
    { key: "mimeType", type: "string", label: "MIME type" },
    { key: "url", type: "string", label: "Presigned download URL" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = { rowId: asRecordId(input.rowId) };
    const extra = Array.isArray(input.rowIds) ? input.rowIds : String(input.rowIds ?? "").trim();
    if (extra.length > 0) {
      const ids = asIds(extra, "rowIds");
      if (ids.length > 249) throw new Error("rowIds may list at most 249 additional records");
      body.rowIds = ids;
    }
    const data = await new NinoxClient(ctx).data<Output>(`/reports/${seg(input.reportId)}/print`, {
      method: "POST",
      body,
    });
    return { fileName: data?.fileName, mimeType: data?.mimeType, url: data?.url };
  },
};

export default reportPrint;
