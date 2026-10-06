import type { ActionDefinition } from "@w6w/types";
import { mapFile, MillionVerifierClient } from "../lib/client.ts";

interface Input {
  offset?: number;
  limit?: number;
  id?: string;
  name?: string;
  status?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
  createdFrom?: string;
  createdTo?: string;
  percentFrom?: number;
  percentTo?: number;
  hasError?: boolean;
}

/**
 * `GET /bulkapi/v2/filelist` — offset pagination (`offset`, `limit` max 50), filters ANDed.
 * The vendor ignores a filter whose value does not parse rather than rejecting it, so a
 * mistyped date silently returns everything.
 */
const bulkListFiles: ActionDefinition<Input> = {
  key: "bulk-list-files",
  type: "search",
  resource: "bulk-file",
  title: "List Bulk Files",
  description: "List uploaded bulk files, optionally filtered. Pages by offset; `nextOffset` is " +
    "set while more files remain.",
  params: [
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { min: 0, integer: true },
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 50, integer: true },
      hint: "Files per page; the vendor caps it at 50.",
    },
    { key: "id", label: "File IDs", type: "string", hint: "One ID, or several comma separated." },
    { key: "name", label: "Name contains", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "One or several comma separated: in_progress, error, finished, canceled, paused, " +
        "in_queue_to_start. Unknown values are ignored by the vendor.",
    },
    {
      key: "updatedAtFrom",
      label: "Updated after",
      type: "string",
      advanced: true,
      placeholder: "2023-01-01 15:00:05",
      hint: "yyyy-MM-dd HH:mm:ss. A value in another format is silently ignored.",
    },
    {
      key: "updatedAtTo",
      label: "Updated before",
      type: "string",
      advanced: true,
      placeholder: "2023-01-01 15:00:05",
    },
    {
      key: "createdFrom",
      label: "Created after",
      type: "string",
      advanced: true,
      placeholder: "2023-01-01 15:00:05",
    },
    {
      key: "createdTo",
      label: "Created before",
      type: "string",
      advanced: true,
      placeholder: "2023-01-01 15:00:05",
    },
    { key: "percentFrom", label: "Progress at least (%)", type: "number", advanced: true },
    { key: "percentTo", label: "Progress at most (%)", type: "number", advanced: true },
    { key: "hasError", label: "Has errors", type: "boolean", advanced: true },
  ],
  output: [
    { key: "files", type: "array", label: "Bulk file records" },
    { key: "total", type: "number", label: "Files matching the filters" },
    { key: "nextOffset", type: "number", label: "Offset of the next page, null at the end" },
  ],

  async execute(input, ctx) {
    const offset = Number(input.offset ?? 0) || 0;
    const limit = input.limit === undefined || input.limit === null ? 50 : Number(input.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new Error("limit must be a whole number between 1 and 50");
    }
    const { body } = await new MillionVerifierClient(ctx).request("/bulkapi/v2/filelist", {
      api: "bulk",
      query: {
        offset,
        limit,
        id: input.id,
        name: input.name,
        status: input.status,
        updated_at_from: input.updatedAtFrom,
        updated_at_to: input.updatedAtTo,
        createdate_from: input.createdFrom,
        createdate_to: input.createdTo,
        percent_from: input.percentFrom,
        percent_to: input.percentTo,
        has_error: input.hasError === undefined || input.hasError === null
          ? undefined
          : input.hasError
          ? "true"
          : "false",
      },
    });
    const b = (body ?? {}) as { files?: unknown[]; total?: number };
    const files = Array.isArray(b.files) ? b.files.map(mapFile) : [];
    const total = typeof b.total === "number" ? b.total : files.length;
    const next = offset + files.length;
    return { files, total, nextOffset: files.length > 0 && next < total ? next : null };
  },
};

export default bulkListFiles;
