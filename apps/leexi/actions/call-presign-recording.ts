import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient } from "../lib/client.ts";

interface Input {
  extension: string;
}

/** `POST /calls/presign_recording_url` */
const callPresignRecording: ActionDefinition<Input> = {
  key: "call-presign-recording",
  type: "perform",
  resource: "call",
  title: "Request Recording Upload",
  description:
    "Get a presigned S3 URL and `recording_s3_key` for uploading a call recording by a single PUT. The file expires after 3 days unless used by Create Call.",
  idempotent: false,
  params: [
    {
      key: "extension",
      label: "File extension",
      type: "string",
      required: true,
      hint:
        "With the dot. Video: .mp4 .mkv .avi .webm .mov .wmv .mpg .mpeg .m4v. Audio: .mp3 .wav .aac .flac .ogg .m4a .wma .opus .aiff and others.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label:
        "{ recording_s3_key, url, headers } — PUT the file to `url` with those headers, then pass recording_s3_key to Create Call",
    },
    { key: "message", type: "string", label: "Leexi's confirmation message" },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("POST", "/calls/presign_recording_url", {
      body: compact({ extension: input.extension }),
    });
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default callPresignRecording;
