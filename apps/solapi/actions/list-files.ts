import type { ActionDefinition } from "@w6w/types";
import { SolapiClient } from "../lib/client.ts";

/**
 * List Files — List files in SOLAPI storage (MMS images and the like) with their fileId, URL, size and dimensions. The fileId is what Send Message takes as Image ID. Cursor-paged.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  fileId?: string;
  type?: string;
  name?: string;
  limit?: number;
  startKey?: string;
}

const listFiles: ActionDefinition<Input> = {
  key: "list-files",
  type: "read",
  resource: "file",
  title: "List Files",
  description:
    "List files in SOLAPI storage (MMS images and the like) with their fileId, URL, size and dimensions. The fileId is what Send Message takes as Image ID. Cursor-paged.",
  params: [
    {
      "key": "fileId",
      "label": "File ID",
      "type": "string",
    },
    {
      "key": "type",
      "label": "Type",
      "type": "string",
      "hint": "A storage file type, e.g. MMS.",
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "limit",
      "label": "Page size",
      "type": "number",
      "hint": "1 to 1000, default 20.",
    },
    {
      "key": "startKey",
      "label": "Start key",
      "type": "string",
      "hint": "`nextKey` from the previous page, to fetch the next one.",
    },
  ],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Files on this page",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Rows on this page",
    },
    {
      "key": "nextKey",
      "type": "string",
      "label": "Cursor for the next page, null on the last page",
    },
    {
      "key": "limit",
      "type": "number",
      "label": "Page size applied",
    },
  ],

  execute(input, ctx) {
    return new SolapiClient(ctx).page("/storage/v1/files", "fileList", {
      query: {
        fileId: input.fileId,
        type: input.type,
        name: input.name,
        limit: input.limit,
        startKey: input.startKey,
      },
    });
  },
};

export default listFiles;
