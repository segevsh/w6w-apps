import type { ActionDefinition } from "@w6w/types";
import { EdenClient, list } from "../lib/client.ts";

/**
 * `POST /v3/upload/delete` - body `{file_ids: [1..100]}`.
 *
 * The bulk `DELETE /v3/upload` (delete ALL files) is deliberately not exposed.
 */
interface Input {
  fileIds: string;
}

const fileDelete: ActionDefinition<Input> = {
  key: "file-delete",
  type: "perform",
  resource: "file",
  title: "Delete Uploaded Files",
  description: "Delete specific uploaded files by ID (1 to 100 at a time).",
  idempotent: true,
  params: [
    {
      key: "fileIds",
      label: "File IDs",
      type: "text",
      required: true,
      hint: "Comma- or newline-separated file ids.",
    },
  ],
  output: [{ key: "deletedCount", type: "number", label: "Files deleted" }],

  async execute(input, ctx) {
    const ids = list(input.fileIds);
    if (ids.length < 1 || ids.length > 100) throw new Error("Provide between 1 and 100 file IDs");
    const res = await new EdenClient(ctx).json<{ deleted_count?: number }>("/upload/delete", {
      method: "POST",
      body: { file_ids: ids },
    });
    return { deletedCount: res.deleted_count ?? 0 };
  },
};

export default fileDelete;
