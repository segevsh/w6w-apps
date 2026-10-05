import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  recordingId: string;
  onBehalfOf?: string;
}

const recordingGet: ActionDefinition<Input> = {
  key: "recording-get",
  type: "read",
  resource: "recording",
  title: "Get Recording",
  description: "Retrieve one recording by id, with its transcript and AI notes.",
  params: [
    {
      key: "recordingId",
      label: "Recording ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Recordings result, or a note's `recording_ids`.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "id", type: "string", label: "Recording id" },
    { key: "title", type: "string", label: "Title" },
    { key: "started_at", type: "string", label: "Start time" },
    { key: "ended_at", type: "string", label: "End time" },
    { key: "note_id", type: "string", label: "Linked note id" },
    { key: "transcript", type: "object", label: "speech_segments and language_code" },
    { key: "ai_notes", type: "array", label: "AI note sections" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).unwrap("recording", `/recording/${encodeId(input.recordingId)}`, {
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default recordingGet;
