import type { ActionDefinition } from "@w6w/types";
import { GladiaClient } from "../lib/client.ts";
import { jobOutputFields, transcriptionIdParam } from "../lib/params.ts";

/**
 * `GET /v2/pre-recorded/{id}` — the job's status and, once `status` is `done`, its result.
 * Returns the job whatever its status (`error` included, with `error_code`).
 */
interface Input {
  transcriptionId: string;
}

const transcriptionGet: ActionDefinition<Input> = {
  key: "transcription-get",
  type: "read",
  resource: "transcription",
  title: "Get Transcription",
  description: 'Get a pre-recorded job\'s status and, once status is "done", its result.',
  params: [transcriptionIdParam],
  output: jobOutputFields,

  execute(input, ctx) {
    return new GladiaClient(ctx).json(
      `/v2/pre-recorded/${encodeURIComponent(input.transcriptionId)}`,
    );
  },
};

export default transcriptionGet;
