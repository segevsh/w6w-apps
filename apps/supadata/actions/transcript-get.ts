import type { ActionDefinition } from "@w6w/types";
import { compact, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  url: string;
  lang?: string;
  text?: boolean;
  chunkSize?: number;
  mode?: "auto" | "native" | "generate";
}

const transcriptGet: ActionDefinition<Input> = {
  key: "transcript-get",
  type: "read",
  resource: "transcript",
  title: "Get Transcript",
  description:
    "Get the transcript of a YouTube, TikTok, Instagram, X (Twitter) or Facebook video, or of a " +
    "public media file URL. Answers with the transcript, or — when it must be generated and is too " +
    "long to wait for — with a job id to poll with Get Transcript Job (`pending` is true).",
  params: [
    {
      key: "url",
      label: "Video URL",
      type: "string",
      required: true,
      placeholder: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    {
      key: "lang",
      label: "Language",
      type: "string",
      placeholder: "en",
      hint: "ISO 639-1 code. Falls back to the first available language when not offered.",
    },
    {
      key: "text",
      label: "Plain text",
      type: "boolean",
      default: false,
      hint: "Return one string instead of timed segments.",
    },
    {
      key: "chunkSize",
      label: "Max characters per segment",
      type: "number",
      validation: { integer: true, min: 50, max: 10000 },
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      default: "auto",
      hint: "`native` only fetches an existing transcript (1 credit). `generate` always uses AI " +
        "(2 credits per minute). `auto` tries native, then generates. A file URL is always generated.",
      options: [
        { value: "auto", label: "Auto" },
        { value: "native", label: "Native only" },
        { value: "generate", label: "Generate with AI" },
      ],
    },
  ],
  output: [
    { key: "pending", type: "boolean", label: "True when only a job id came back" },
    {
      key: "jobId",
      type: "string",
      label: "Job id, when the transcript is generated asynchronously",
    },
    {
      key: "content",
      type: "object",
      label: "Segments (offset/duration in ms), or text when `text` is set",
    },
    { key: "lang", type: "string", label: "Transcript language" },
    { key: "availableLangs", type: "array", label: "Languages on offer" },
  ],

  async execute(input, ctx) {
    const res = await new SupadataClient(ctx).json<Record<string, unknown>>("/transcript", {
      query: compact({
        url: requireText(input.url, "Video URL"),
        lang: input.lang?.trim(),
        text: input.text || undefined,
        chunkSize: input.chunkSize,
        mode: input.mode,
      }),
    });
    if (typeof res.jobId === "string" && res.content === undefined) {
      return { pending: true, jobId: res.jobId };
    }
    return { pending: false, ...res };
  },
};

export default transcriptGet;
