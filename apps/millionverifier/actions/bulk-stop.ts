import type { ActionDefinition } from "@w6w/types";
import { MillionVerifierClient, required } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/** `GET /bulkapi/stop?file_id=…` — a GET that cancels the run; answers `{result: "ok"}`. */
const bulkStop: ActionDefinition<Input> = {
  key: "bulk-stop",
  type: "perform",
  idempotent: true,
  resource: "bulk-file",
  title: "Stop Bulk File",
  description: "Cancel a bulk file that is in progress. Results for the addresses already " +
    "verified can be downloaded shortly after.",
  params: [{ key: "fileId", label: "File ID", type: "string", required: true }],
  output: [{ key: "result", type: "string", label: "ok" }],

  async execute(input, ctx) {
    const { body } = await new MillionVerifierClient(ctx).request("/bulkapi/stop", {
      api: "bulk",
      query: { file_id: required(input.fileId, "fileId") },
    });
    return { result: (body as { result?: string } | undefined)?.result };
  },
};

export default bulkStop;
