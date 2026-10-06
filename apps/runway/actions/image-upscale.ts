import { generationAction, modelParam } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  imageUri: string;
  scaleFactor?: number | string;
  sharpen?: number;
  smartGrain?: number;
  ultraDetail?: number;
  flavor?: string;
}

/** `POST /v1/image_upscale` — one model today, `magnific_precision_upscaler_v2`. */
export default generationAction<Input>({
  key: "image-upscale",
  title: "Upscale Image",
  description: "Start an image upscale (Magnific precision upscaler).",
  path: "/v1/image_upscale",
  params: [
    modelParam("The upscaler model id.", "magnific_precision_upscaler_v2"),
    { key: "imageUri", label: "Image URI", type: "string", required: true },
    {
      key: "scaleFactor",
      label: "Scale factor",
      type: "select",
      options: [2, 4, 8, 16].map((v) => ({ value: String(v), label: `${v}x` })),
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
      key: "ultraDetail",
      label: "Ultra detail",
      type: "number",
      validation: { min: 0, max: 100, integer: true },
    },
    {
      key: "flavor",
      label: "Flavor",
      type: "select",
      options: ["sublime", "photo", "photo_denoiser"].map((v) => ({ value: v, label: v })),
    },
  ],
  build: (i) => ({
    imageUri: i.imageUri,
    // the vendor's enum is numeric (2 | 4 | 8 | 16); a select hands back a string
    scaleFactor: i.scaleFactor === undefined || i.scaleFactor === null || i.scaleFactor === ""
      ? undefined
      : Number(i.scaleFactor),
    sharpen: i.sharpen,
    smartGrain: i.smartGrain,
    ultraDetail: i.ultraDetail,
    flavor: i.flavor,
  }),
});
