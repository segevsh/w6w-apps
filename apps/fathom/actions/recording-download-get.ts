import type { ActionDefinition } from "@w6w/types";
import { FathomClient } from "../lib/client.ts";
import { recordingIdParam } from "../lib/params.ts";

interface Input {
  recordingId: number;
  downloadId: string;
}

/**
 * `GET /recordings/{recording_id}/downloads/{download_id}` — the status of a
 * download started by Request Recording Download.
 *
 * `status` is `processing`, `completed`, `failed` or `expired`. Once
 * `completed`, the payload carries `video` or `audio` with a short-lived signed
 * `url`, its `content_type`, `file_size_bytes` and `expires_at`. Only the API
 * client that created the download can read it; request a new one once
 * `expires_at` passes.
 *
 * Polling counts against Fathom's global rate limit (60 / 60s), not the
 * separate download-request budget.
 */
const recordingDownloadGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "recording-download-get",
  type: "read",
  resource: "recording",
  title: "Get Recording Download",
  description: "Poll the status of a requested recording download and read its signed file URL.",
  params: [
    recordingIdParam,
    {
      key: "downloadId",
      label: "Download ID",
      type: "string",
      required: true,
      hint: "The `download_id` returned by Request Recording Download.",
      placeholder: "dl_CJAj1YPuruCgWHaKgEBv6Mb1UsNj8x",
    },
  ],
  output: [
    { key: "download_id", type: "string", label: "Download ID" },
    { key: "recording_id", type: "number", label: "Recording ID" },
    { key: "status", type: "string", label: "processing | completed | failed | expired" },
    { key: "video", type: "object", label: "Video file payload (url, content_type, expires_at)" },
    { key: "audio", type: "object", label: "Audio file payload (url, content_type, expires_at)" },
    { key: "failure_reason", type: "string", label: "generation_failed | generation_timeout" },
  ],

  async execute(input, ctx) {
    const body = await new FathomClient(ctx).request<Record<string, unknown>>(
      `/recordings/${encodeURIComponent(String(input.recordingId))}/downloads/${
        encodeURIComponent(input.downloadId)
      }`,
    );
    return body ?? {};
  },
};

export default recordingDownloadGet;
