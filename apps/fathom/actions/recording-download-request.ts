import type { ActionDefinition } from "@w6w/types";
import { compact, FathomClient } from "../lib/client.ts";
import { destinationUrlParam, recordingIdParam } from "../lib/params.ts";

interface Input {
  recordingId: number;
  destinationUrl?: string;
}

/**
 * `POST /recordings/{recording_id}/download` — start generating a downloadable
 * file. Answers **202** with `{ download_id, recording_id, status }`.
 *
 * Video is rendered in the background, so the usual flow is: call this, then
 * poll Get Recording Download with the returned `download_id` until `status` is
 * `completed`. Audio-only recordings complete immediately, so the 202 may
 * already carry the finished `audio` payload. Passing `destinationUrl` instead
 * has Fathom POST the completed payload to you rather than making you poll.
 *
 * Access and expiry, both the vendor's rules: a download is private to the API
 * client that created it, the signed URL expires roughly 24 hours after
 * generation, and only the owner, teammates who can view the recording, and
 * standard/admin-level shares may download — limited-access shares get 403.
 * A recording with no downloadable media answers 422.
 *
 * Its own rate limit: 30 download requests / 60s, separate from the heavy-request
 * budget. Polling the status endpoint counts against the global limit instead.
 */
const recordingDownloadRequest: ActionDefinition<Input, Record<string, unknown>> = {
  key: "recording-download-request",
  type: "perform",
  resource: "recording",
  title: "Request Recording Download",
  description:
    "Start generating a downloadable video or audio file for a recording, and get a download ID to poll.",
  // Each POST starts a fresh generation and mints a new `download_id`; Fathom
  // offers no request key to dedupe on, so a retry produces a second download.
  idempotent: false,
  params: [recordingIdParam, destinationUrlParam],
  output: [
    { key: "download_id", type: "string", label: "Download ID (poll with Get Recording Download)" },
    { key: "recording_id", type: "number", label: "Recording ID" },
    { key: "status", type: "string", label: "processing | completed | failed | expired" },
    { key: "video", type: "object", label: "Video file payload (when completed)" },
    { key: "audio", type: "object", label: "Audio file payload (when completed)" },
    { key: "failure_reason", type: "string", label: "generation_failed | generation_timeout" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "requesting Fathom recording download", { recordingId: input.recordingId });
    const body = await new FathomClient(ctx).request<Record<string, unknown>>(
      `/recordings/${encodeURIComponent(String(input.recordingId))}/download`,
      { method: "POST", body: compact({ destination_url: input.destinationUrl }) },
    );
    return body ?? {};
  },
};

export default recordingDownloadRequest;
