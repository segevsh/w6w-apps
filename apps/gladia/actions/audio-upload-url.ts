import type { ActionDefinition } from "@w6w/types";
import { GladiaClient } from "../lib/client.ts";

/**
 * `POST /v2/upload` with the JSON body `{"audio_url": "<url>"}` — have Gladia fetch a remote
 * file and host it, returning a Gladia `audio_url` plus detected metadata (duration, size,
 * channels). Starting a job does NOT require this step (Start Transcription accepts an
 * external URL directly); it is useful to validate a file or read its duration first.
 *
 * The same endpoint also takes `multipart/form-data` with a binary `audio` part. That form
 * is not offered: an action's params are JSON and cannot carry file bytes through `ctx.fetch`.
 */
interface Input {
  audioUrl: string;
}

const audioUploadUrl: ActionDefinition<Input> = {
  key: "audio-upload-url",
  type: "perform",
  resource: "audio",
  title: "Upload Audio URL",
  description: "Have Gladia fetch a remote audio or video file and return a Gladia-hosted " +
    "audio_url with its detected duration, size and channel count.",
  // Each call stores another copy and returns a new file id.
  idempotent: false,
  params: [
    {
      key: "audioUrl",
      label: "Audio URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/call.mp3",
      hint: "A publicly reachable audio or video file.",
    },
  ],
  output: [
    { key: "audio_url", type: "string", label: "Gladia-hosted audio URL" },
    { key: "audio_metadata.id", type: "string", label: "File ID" },
    { key: "audio_metadata.filename", type: "string", label: "Filename" },
    { key: "audio_metadata.extension", type: "string", label: "Extension" },
    { key: "audio_metadata.size", type: "number", label: "Size (bytes)" },
    { key: "audio_metadata.audio_duration", type: "number", label: "Duration (seconds)" },
    { key: "audio_metadata.number_of_channels", type: "number", label: "Channels" },
  ],

  execute(input, ctx) {
    return new GladiaClient(ctx).json("/v2/upload", {
      method: "POST",
      body: { audio_url: input.audioUrl },
    });
  },
};

export default audioUploadUrl;
