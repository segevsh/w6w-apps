import type { ActionDefinition } from "@w6w/types";
import { compact, extraFields, need, RunwayClient } from "../lib/client.ts";
import { MODERATION, moderation, SEED } from "../lib/generation.ts";

interface Input {
  configId: string;
  promptText: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  audio?: boolean;
  seed?: number;
  publicFigureThreshold?: string;
  dryRun?: boolean;
  extra?: unknown;
}

/**
 * `POST /v1/generate/video` — a saved Model Router picks the model. The body is
 * `{ configId, dryRun?, input }` where `input` holds the model-independent fields. With
 * `dryRun: true` the answer carries only `routing` (the model that would run and its estimated
 * cost) and no task is created.
 */
const generateVideo: ActionDefinition<Input> = {
  key: "generate-video",
  type: "perform",
  idempotent: false,
  resource: "task",
  title: "Generate Video (Model Router)",
  description: "Start a video generation through a saved Model Router instead of naming a " +
    "model. With Dry run, only previews which model would run and what it would cost.",
  params: [
    {
      key: "configId",
      label: "Router slug",
      type: "string",
      required: true,
      hint: "The slug of a saved Model Router (see List Model Routers).",
    },
    { key: "promptText", label: "Prompt", type: "text", required: true },
    { key: "negativePrompt", label: "Negative prompt", type: "text" },
    {
      key: "duration",
      label: "Duration (seconds)",
      type: "number",
      validation: { min: 2, max: 30, integer: true },
    },
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      type: "select",
      options: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "select",
      options: ["480p", "720p", "1080p", "4k"].map((v) => ({ value: v, label: v })),
    },
    { key: "audio", label: "Generate audio", type: "boolean" },
    SEED,
    MODERATION,
    {
      key: "dryRun",
      label: "Dry run",
      type: "boolean",
      hint: "Preview the routing decision; no task, no credits.",
    },
    {
      key: "extra",
      label: "Extra input fields (JSON)",
      type: "json",
      hint: "Merged into `input`: referenceImages, referenceVideos, referenceAudio, keyframes.",
    },
  ],
  output: [
    { key: "taskId", type: "string", label: "Task id (absent on a dry run)" },
    { key: "dryRun", type: "boolean", label: "Whether this was a dry run" },
    {
      key: "routing",
      type: "object",
      label: "Chosen model, provider, resolved input, estimated cost",
    },
  ],

  async execute(input, ctx) {
    const body = compact({
      configId: need(input.configId, "configId"),
      dryRun: input.dryRun,
      input: {
        ...extraFields(input.extra),
        ...compact({
          promptText: need(input.promptText, "promptText"),
          negativePrompt: input.negativePrompt,
          duration: input.duration,
          aspectRatio: input.aspectRatio,
          resolution: input.resolution,
          audio: input.audio,
          seed: input.seed,
          contentModeration: moderation(input.publicFigureThreshold),
        }),
      },
    });
    const { data } = await new RunwayClient(ctx).request("/v1/generate/video", {
      method: "POST",
      body,
    });
    const d = (data ?? {}) as { id?: string; dryRun?: boolean; routing?: unknown };
    return { taskId: d.id, dryRun: d.dryRun ?? false, routing: d.routing };
  },
};

export default generateVideo;
