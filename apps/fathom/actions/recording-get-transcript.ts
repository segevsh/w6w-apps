import type { ActionDefinition } from "@w6w/types";
import { FathomClient } from "../lib/client.ts";
import { destinationUrlParam, recordingIdParam } from "../lib/params.ts";

interface Input {
  recordingId: number;
  destinationUrl?: string;
}

/**
 * `GET /recordings/{recording_id}/transcript` — the full transcript for one
 * recording, as `{ transcript: [{ speaker, text, timestamp }, …] }`.
 *
 * Each entry's `timestamp` is `HH:MM:SS` relative to the start of the meeting,
 * and `speaker.matched_calendar_invitee_email` is the calendar invitee the
 * speaker was matched to, or `null` when no exact match was found.
 *
 * Same two modes as Get Recording Summary: inline by default, or POSTed to
 * `destinationUrl` if one is given. A **heavy** request either way (30 / 60s,
 * dropping to 5 during elevated activity).
 */
const recordingGetTranscript: ActionDefinition<Input, Record<string, unknown>> = {
  key: "recording-get-transcript",
  type: "read",
  resource: "recording",
  title: "Get Recording Transcript",
  description: "Fetch the transcript for one meeting recording.",
  params: [recordingIdParam, destinationUrlParam],
  output: [
    { key: "transcript", type: "array", label: "Transcript entries (speaker, text, timestamp)" },
    {
      key: "destination_url",
      type: "string",
      label: "Where Fathom will POST the transcript (async mode only)",
    },
  ],

  async execute(input, ctx) {
    const body = await new FathomClient(ctx).request<Record<string, unknown>>(
      `/recordings/${encodeURIComponent(String(input.recordingId))}/transcript`,
      { query: { destination_url: input.destinationUrl } },
    );
    return body ?? {};
  },
};

export default recordingGetTranscript;
