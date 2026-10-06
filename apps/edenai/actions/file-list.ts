import type { ActionDefinition } from "@w6w/types";
import { compact, EdenClient } from "../lib/client.ts";

/** `GET /v3/upload` - page-numbered (`page` from 1, `limit` 1-1000, vendor default 100). */
interface Input {
  purpose?: string;
  page?: number;
  limit?: number;
}

const fileList: ActionDefinition<Input> = {
  key: "file-list",
  type: "search",
  resource: "file",
  title: "List Uploaded Files",
  description:
    "List files uploaded to Eden AI. A file id can be used as an input to OCR and other expert models.",
  params: [
    {
      key: "purpose",
      label: "Purpose",
      type: "string",
      hint: "Filter by the purpose it was uploaded with.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
    {
      key: "limit",
      label: "Per page",
      type: "number",
      default: 20,
      hint: "The vendor default is 100 and its maximum 1000; this form asks for 20.",
      validation: { min: 1, max: 1000, integer: true },
    },
  ],
  output: [
    {
      key: "files",
      type: "array",
      label:
        "Files (file_id, file_name, file_size, file_mimetype, purpose, created_at, expires_at)",
    },
    { key: "total", type: "number", label: "Total files" },
    { key: "page", type: "number", label: "Page" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<
      { items?: unknown[]; total?: number; page?: number; total_pages?: number }
    >("/upload", {
      query: compact({ purpose: input.purpose, page: input.page ?? 1, limit: input.limit ?? 20 }),
    });
    return {
      files: res.items ?? [],
      total: res.total,
      page: res.page,
      totalPages: res.total_pages,
    };
  },
};

export default fileList;
