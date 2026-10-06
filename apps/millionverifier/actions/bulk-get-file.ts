import type { ActionDefinition } from "@w6w/types";
import { FILE_OUTPUT, mapFile, MillionVerifierClient, required } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/** `GET /bulkapi/v2/fileinfo?file_id=…` — progress and per-status counts of one file. */
const bulkGetFile: ActionDefinition<Input> = {
  key: "bulk-get-file",
  type: "read",
  resource: "bulk-file",
  title: "Get Bulk File",
  description: "Read the progress and result counts of an uploaded bulk file.",
  params: [{ key: "fileId", label: "File ID", type: "string", required: true }],
  output: FILE_OUTPUT,

  async execute(input, ctx) {
    const { body } = await new MillionVerifierClient(ctx).request("/bulkapi/v2/fileinfo", {
      api: "bulk",
      query: { file_id: required(input.fileId, "fileId") },
    });
    return mapFile(body);
  },
};

export default bulkGetFile;
