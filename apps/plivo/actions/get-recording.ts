import type { ActionDefinition } from "@w6w/types";
import { PlivoClient, segment } from "../lib/client.ts";

interface Input {
  recordingId: string;
}

/** `GET /v1/Account/{auth_id}/Recording/{recording_id}/` — metadata, not the audio. */
const getRecording: ActionDefinition<Input> = {
  key: "get-recording",
  type: "read",
  resource: "recording",
  title: "Get Recording",
  description: "Retrieve the metadata of one call recording.",
  params: [{ key: "recordingId", label: "Recording ID", type: "string", required: true }],

  output: [
    { key: "recording_id", type: "string", label: "Recording ID" },
    { key: "call_uuid", type: "string", label: "Call UUID" },
    { key: "recording_url", type: "string", label: "Recording URL" },
    { key: "recording_format", type: "string", label: "Format" },
    { key: "recording_duration_ms", type: "string", label: "Duration (ms)" },
    { key: "from_number", type: "string", label: "From" },
    { key: "to_number", type: "string", label: "To" },
    { key: "add_time", type: "string", label: "Added at" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request(`Recording/${segment("recordingId", input.recordingId)}/`);
  },
};

export default getRecording;
