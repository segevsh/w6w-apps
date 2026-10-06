import type { ActionDefinition } from "@w6w/types";
import { MillionVerifierClient, required } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/** `GET /bulkapi/v2/delete?file_id=…` — a GET that deletes the file; answers `{result: "ok"}`. */
const bulkDelete: ActionDefinition<Input> = {
  key: "bulk-delete",
  type: "perform",
  idempotent: true,
  resource: "bulk-file",
  title: "Delete Bulk File",
  description: "Delete an uploaded bulk file and its results. Download anything needed first.",
  params: [{ key: "fileId", label: "File ID", type: "string", required: true }],
  output: [{ key: "result", type: "string", label: "ok" }],

  async execute(input, ctx) {
    const { body } = await new MillionVerifierClient(ctx).request("/bulkapi/v2/delete", {
      api: "bulk",
      query: { file_id: required(input.fileId, "fileId") },
    });
    return { result: (body as { result?: string } | undefined)?.result };
  },
};

export default bulkDelete;
