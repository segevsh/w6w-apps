import type { ActionDefinition } from "@w6w/types";
import { GladiaClient } from "../lib/client.ts";
import { transcriptionIdParam } from "../lib/params.ts";

/**
 * `DELETE /v2/pre-recorded/{id}` — remove the job and all its data (audio and transcript).
 * HTTP 202 with no body on success; 403 if the job is not in a deletable state (still
 * running), 404 if it never existed or is already gone.
 */
interface Input {
  transcriptionId: string;
}

const transcriptionDelete: ActionDefinition<Input> = {
  key: "transcription-delete",
  type: "perform",
  resource: "transcription",
  title: "Delete Transcription",
  description: "Delete a pre-recorded job and all its data (audio file and transcript).",
  // The first delete succeeds; a repeat is a 404 error, so a retry is not transparent.
  idempotent: false,
  params: [transcriptionIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the job was deleted" },
    { key: "id", type: "string", label: "Job ID" },
  ],

  async execute(input, ctx) {
    await new GladiaClient(ctx).json(
      `/v2/pre-recorded/${encodeURIComponent(input.transcriptionId)}`,
      { method: "DELETE" },
    );
    return { deleted: true, id: input.transcriptionId };
  },
};

export default transcriptionDelete;
