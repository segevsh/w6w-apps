import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/** `GET /v1/meetings/{uuid}/` — one meeting. */
interface Input {
  meetingUuid: string;
}

const meetingGet: ActionDefinition<Input> = {
  key: "meeting-get",
  type: "read",
  resource: "meeting",
  title: "Get Meeting",
  description: "Fetch one meeting: subject, times, attendees, outcome, and which of the " +
    "recording, transcript and notes are ready.",
  params: [{ key: "meetingUuid", label: "Meeting UUID", type: "string", required: true }],
  output: [
    { key: "uuid", type: "string", label: "Meeting UUID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "start_at", type: "string", label: "Start (UTC)" },
    { key: "end_at", type: "string", label: "End (UTC)" },
    { key: "state", type: "string", label: "State" },
    { key: "organizer_email", type: "string", label: "Organizer email" },
    { key: "attendees", type: "array", label: "Attendees" },
    { key: "transcript_ready", type: "boolean", label: "Transcript ready" },
    { key: "notes_ready", type: "boolean", label: "Notes ready" },
    { key: "transcription_uuid", type: "string", label: "Transcription UUID" },
    { key: "recording_uuid", type: "string", label: "Recording UUID" },
    { key: "url", type: "string", label: "Avoma URL" },
  ],

  execute(input, ctx) {
    return new AvomaClient(ctx).get(`/v1/meetings/${seg(input.meetingUuid, "meetingUuid")}/`);
  },
};

export default meetingGet;
