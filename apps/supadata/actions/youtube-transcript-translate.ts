import type { ActionDefinition } from "@w6w/types";
import { compact, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  url?: string;
  videoId?: string;
  lang: string;
  text?: boolean;
  chunkSize?: number;
}

const youtubeTranscriptTranslate: ActionDefinition<Input> = {
  key: "youtube-transcript-translate",
  type: "read",
  resource: "youtube",
  title: "Translate YouTube Transcript",
  description: "Translate a YouTube video's transcript into another language.",
  params: [
    { key: "url", label: "Video URL", type: "string", hint: "Give this or a video id." },
    { key: "videoId", label: "Video id", type: "string" },
    {
      key: "lang",
      label: "Target language",
      type: "string",
      required: true,
      placeholder: "es",
      hint: "ISO 639-1 code.",
    },
    { key: "text", label: "Plain text", type: "boolean", default: false },
    {
      key: "chunkSize",
      label: "Max characters per segment",
      type: "number",
      validation: { integer: true, min: 50, max: 10000 },
    },
  ],
  output: [
    { key: "content", type: "object", label: "Segments, or text when `text` is set" },
    { key: "lang", type: "string", label: "Language of the translation" },
  ],

  async execute(input, ctx) {
    const url = input.url?.trim();
    const videoId = input.videoId?.trim();
    if (!url && !videoId) throw new Error("Provide a video URL or a video id");
    return await new SupadataClient(ctx).json("/youtube/transcript/translate", {
      query: compact({
        url,
        videoId: url ? undefined : videoId,
        lang: requireText(input.lang, "Target language"),
        text: input.text || undefined,
        chunkSize: input.chunkSize,
      }),
    });
  },
};

export default youtubeTranscriptTranslate;
