import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, looseValue, PlacidClient, requireJson } from "../lib/client.ts";
import { passthroughParam, renderOutput, transferParam, webhookParam } from "../lib/params.ts";

interface Input {
  clips: unknown;
  webhook_success?: string;
  passthrough?: unknown;
  width?: number;
  height?: number;
  fps?: number;
  filename?: string;
  canvas_background?: string;
  transfer?: unknown;
}

/** `POST /videos` — queue a video from one or more template clips, merged in order. Every 10 seconds of output = 10 credits; maximum length 180 seconds. */
const action: ActionDefinition<Input, unknown> = {
  key: "video-create",
  type: "perform",
  resource: "video",
  title: "Create Video",
  description:
    "Render an MP4 from one or more template clips (merged in order). Asynchronous; costs 10 credits per 10 seconds of output (max 3 minutes) and is not safe to retry blindly.",
  idempotent: false,
  params: [
    {
      key: "clips",
      label: "Clips",
      type: "json",
      required: true,
      hint:
        'Array of clips, each `{"template_uuid":"…","layers":{"video":{"video":"https://…mp4"}},"audio":"https://…mp3","audio_duration":"auto","audio_trim_start":"00:00:45","audio_trim_end":"00:00:55"}`. Merged in the order given.',
    },
    webhookParam,
    passthroughParam,
    {
      key: "width",
      label: "Width (px)",
      type: "number",
      advanced: true,
      hint: "Empty = sized by the first clip's template.",
    },
    { key: "height", label: "Height (px)", type: "number", advanced: true },
    {
      key: "fps",
      label: "Frames per second",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1, max: 30 },
      hint: "Default 25.",
    },
    { key: "filename", label: "Filename", type: "string", advanced: true },
    {
      key: "canvas_background",
      label: "Canvas background",
      type: "string",
      advanced: true,
      hint: "Hex color (default #000000) or `blur`. Used behind clips of differing sizes.",
    },
    transferParam,
  ],
  output: [
    ...renderOutput("video_url"),
  ],

  async execute(input, ctx) {
    const clips = requireJson<unknown[]>(input.clips, "clips");
    if (!Array.isArray(clips) || clips.length === 0) {
      throw new Error("`clips` must be a non-empty array of {template_uuid, layers}");
    }
    const modifications = compact({
      width: input.width,
      height: input.height,
      fps: input.fps,
      filename: input.filename,
      canvas_background: input.canvas_background,
    });
    return await new PlacidClient(ctx).json("/videos", {
      method: "POST",
      body: compact({
        clips,
        webhook_success: input.webhook_success,
        passthrough: looseValue(input.passthrough),
        modifications: Object.keys(modifications).length ? modifications : undefined,
        transfer: asOptionalJson(input.transfer, "transfer"),
      }),
    });
  },
};

export default action;
