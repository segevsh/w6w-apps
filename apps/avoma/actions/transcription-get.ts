import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/** `GET /v1/transcriptions/{uuid}/` — one transcription by its own uuid. */
interface Input {
  transcriptionUuid: string;
}

const transcriptionGet: ActionDefinition<Input> = {
  key: "transcription-get",
  type: "read",
  resource: "transcription",
  title: "Get Transcription",
  description: "Fetch a transcript by its transcription UUID: speakers, timestamped " +
    "paragraphs and the WebVTT URL.",
  params: [{
    key: "transcriptionUuid",
    label: "Transcription UUID",
    type: "string",
    required: true,
    hint: "The `transcription_uuid` on a meeting. Use List Transcriptions to look one up by " +
      "meeting UUID.",
  }],
  output: [
    { key: "uuid", type: "string", label: "Transcription UUID" },
    { key: "meeting_uuid", type: "string", label: "Meeting UUID" },
    { key: "speakers", type: "array", label: "Speakers" },
    { key: "transcript", type: "array", label: "Paragraphs (speaker_id, transcript, timestamps)" },
    { key: "transcription_vtt_url", type: "string", label: "WebVTT URL" },
  ],

  execute(input, ctx) {
    return new AvomaClient(ctx).get(
      `/v1/transcriptions/${seg(input.transcriptionUuid, "transcriptionUuid")}/`,
    );
  },
};

export default transcriptionGet;
