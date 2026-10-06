import type { ActionDefinition } from "@w6w/types";
import { MillionVerifierClient, required } from "../lib/client.ts";

interface Input {
  fileId: string;
  filter: string;
  statuses?: string;
  free?: string;
  role?: string;
}

const FILTERS = ["ok", "ok_and_catch_all", "unknown", "invalid", "all", "custom"];

/**
 * `GET /bulkapi/v2/download` — the result report. A success is a file
 * (`application/octet-stream`), a failure is JSON with `error` on HTTP 200; the client
 * tells them apart by the body. The file is returned inline as `content`, so a very large
 * result is a very large output; narrow it with `filter`.
 */
const bulkDownload: ActionDefinition<Input> = {
  key: "bulk-download",
  type: "read",
  resource: "bulk-file",
  title: "Download Bulk Results",
  description: "Download the verification report of a bulk file, optionally filtered by result. " +
    "The report is returned as text in `content`.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
    {
      key: "filter",
      label: "Filter",
      type: "select",
      required: true,
      default: "all",
      options: FILTERS.map((value) => ({ value, label: value })),
    },
    {
      key: "statuses",
      label: "Statuses (custom filter)",
      type: "string",
      showIf: { "==": [{ var: "filter" }, "custom"] },
      hint: "Comma separated: ok, catch_all, unknown, invalid, disposable. Omitted means all.",
    },
    {
      key: "free",
      label: "Free domains (custom filter)",
      type: "select",
      options: [{ value: "1", label: "Only free" }, { value: "0", label: "Not free" }],
      showIf: { "==": [{ var: "filter" }, "custom"] },
    },
    {
      key: "role",
      label: "Role emails (custom filter)",
      type: "select",
      options: [{ value: "1", label: "Only role" }, { value: "0", label: "Not role" }],
      showIf: { "==": [{ var: "filter" }, "custom"] },
    },
  ],
  output: [
    { key: "content", type: "string", label: "The report (CSV text)" },
    { key: "contentType", type: "string", label: "Response content type" },
    { key: "size", type: "number", label: "Characters in the report" },
  ],

  async execute(input, ctx) {
    const filter = required(input.filter, "filter");
    if (!FILTERS.includes(filter)) throw new Error(`filter must be one of ${FILTERS.join(", ")}`);
    const custom = filter === "custom";
    const res = await new MillionVerifierClient(ctx).request("/bulkapi/v2/download", {
      api: "bulk",
      query: {
        file_id: required(input.fileId, "fileId"),
        filter,
        statuses: custom ? input.statuses : undefined,
        free: custom ? input.free : undefined,
        role: custom ? input.role : undefined,
      },
    });
    return { content: res.text, contentType: res.contentType, size: res.text.length };
  },
};

export default bulkDownload;
