import type { ActionDefinition } from "@w6w/types";
import { compact, EdenClient, parseJson } from "../lib/client.ts";
import { shapeVideo, VIDEO_OUTPUT, type VideoBody } from "../lib/video.ts";

/** `POST /v3/videos` - starts a job; poll it with Get Video. */
interface Input {
  model: string;
  prompt: string;
  seconds?: number;
  size?: string;
  seed?: number;
  providerParams?: unknown;
  webhookReceiver?: string;
}

const videoCreate: ActionDefinition<Input> = {
  key: "video-create",
  type: "perform",
  resource: "video",
  title: "Create Video",
  description: "Start a video generation job from a text prompt. Poll it with Get Video.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      hint:
        "provider/model, e.g. openai/sora-2. The current ids are listed at GET /v3/videos/models.",
    },
    { key: "prompt", label: "Prompt", type: "text", required: true },
    { key: "seconds", label: "Seconds", type: "number", validation: { min: 1, integer: true } },
    {
      key: "size",
      label: "Size",
      type: "string",
      hint: "WIDTHxHEIGHT, e.g. 1280x720. Omitted uses the provider default.",
    },
    { key: "seed", label: "Seed", type: "number", validation: { integer: true } },
    { key: "providerParams", label: "Provider parameters", type: "json" },
    {
      key: "webhookReceiver",
      label: "Webhook URL",
      type: "string",
      hint: "Optional. Notified when the job finishes.",
    },
  ],
  output: VIDEO_OUTPUT,

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<VideoBody>("/videos", {
      method: "POST",
      body: compact({
        model: input.model,
        prompt: input.prompt,
        seconds: input.seconds,
        size: input.size,
        seed: input.seed,
        provider_params: parseJson(input.providerParams, "Provider parameters"),
        webhook_receiver: input.webhookReceiver,
      }),
    });
    return shapeVideo(res);
  },
};

export default videoCreate;
