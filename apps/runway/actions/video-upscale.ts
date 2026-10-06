import { generationAction, modelParam } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  videoUri: string;
  resolution?: string;
  creativity?: number;
  sharpen?: number;
  smartGrain?: number;
  flavor?: string;
  fpsBoost?: boolean;
  targetFramerate?: string;
}

/**
 * `POST /v1/video_upscale` — two models (OpenAPI, 2026-10-06): `magnific_video_upscaler_creative`
 * (resolution, creativity, sharpen, smartGrain, flavor, fpsBoost) and `enhance_frame_rate`
 * (`targetFramerate` required; a string such as "60" or "23_98").
 */
export default generationAction<Input>({
  key: "video-upscale",
  title: "Upscale Video",
  description: "Start a video upscale or frame-rate enhancement.",
  path: "/v1/video_upscale",
  params: [
    modelParam(
      "magnific_video_upscaler_creative or enhance_frame_rate.",
      "magnific_video_upscaler_creative",
    ),
    { key: "videoUri", label: "Video URI", type: "string", required: true },
    {
      key: "resolution",
      label: "Resolution",
      type: "select",
      options: ["720p", "1k", "2k", "4k"].map((v) => ({ value: v, label: v })),
      hint: "magnific_video_upscaler_creative.",
    },
    {
      key: "creativity",
      label: "Creativity",
      type: "number",
      validation: { min: 0, max: 100, integer: true },
    },
    {
      key: "sharpen",
      label: "Sharpen",
      type: "number",
      validation: { min: 0, max: 100, integer: true },
    },
    {
      key: "smartGrain",
      label: "Smart grain",
      type: "number",
      validation: { min: 0, max: 100, integer: true },
    },
    {
      key: "flavor",
      label: "Flavor",
      type: "select",
      options: ["vivid", "natural"].map((v) => ({ value: v, label: v })),
    },
    { key: "fpsBoost", label: "FPS boost", type: "boolean" },
    {
      key: "targetFramerate",
      label: "Target frame rate",
      type: "select",
      options: ["24", "25", "30", "48", "50", "60", "120", "23_98", "29_97", "59_94"].map((v) => ({
        value: v,
        label: v,
      })),
      hint: "Required for enhance_frame_rate.",
    },
  ],
  build: (i) => ({
    videoUri: i.videoUri,
    resolution: i.resolution,
    creativity: i.creativity,
    sharpen: i.sharpen,
    smartGrain: i.smartGrain,
    flavor: i.flavor,
    fpsBoost: i.fpsBoost,
    targetFramerate: i.targetFramerate === undefined ? undefined : String(i.targetFramerate),
  }),
});
