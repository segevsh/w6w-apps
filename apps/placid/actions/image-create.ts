import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, looseValue, PlacidClient, required } from "../lib/client.ts";
import {
  layersParam,
  passthroughParam,
  renderOutput,
  transferParam,
  webhookParam,
} from "../lib/params.ts";

interface Input {
  template_uuid: string;
  layers?: unknown;
  webhook_success?: string;
  create_now?: boolean;
  passthrough?: unknown;
  width?: number;
  height?: number;
  filename?: string;
  image_format?: string;
  dpi?: number;
  color_mode?: string;
  transfer?: unknown;
}

/** `POST /images` — queue one image render from a template. Answers a queued record (`id`, `status`, `image_url: null`, `polling_url`); poll `image-get` or pass `webhook_success`. 1 image = 1 credit. */
const action: ActionDefinition<Input, unknown> = {
  key: "image-create",
  type: "perform",
  resource: "image",
  title: "Create Image",
  description:
    "Render an image from a template. Asynchronous: poll Retrieve Image or pass a webhook URL. Costs 1 credit per image (up to 4000 px) and is not safe to retry blindly.",
  idempotent: false,
  params: [
    { key: "template_uuid", label: "Template UUID", type: "string", required: true },
    layersParam,
    webhookParam,
    {
      key: "create_now",
      label: "Render immediately",
      type: "boolean",
      advanced: true,
      hint:
        "Process the image instantly instead of queueing it. May fail if the worker is busy; limited to 10 simultaneous requests.",
    },
    passthroughParam,
    {
      key: "width",
      label: "Width (px)",
      type: "number",
      advanced: true,
      hint: "The template's aspect ratio is always kept to fit width/height.",
    },
    { key: "height", label: "Height (px)", type: "number", advanced: true },
    { key: "filename", label: "Filename", type: "string", advanced: true },
    {
      key: "image_format",
      label: "Image format",
      type: "select",
      advanced: true,
      options: [
        { value: "auto", label: "auto (jpg or png by transparency)" },
        { value: "jpg", label: "jpg" },
        { value: "png", label: "png" },
        { value: "webp", label: "webp" },
      ],
    },
    {
      key: "dpi",
      label: "DPI",
      type: "select",
      advanced: true,
      options: [
        { value: 72, label: "72 (default)" },
        { value: 150, label: "150" },
        { value: 300, label: "300" },
      ],
    },
    {
      key: "color_mode",
      label: "Color mode",
      type: "select",
      advanced: true,
      options: [{ value: "rgb", label: "rgb (default)" }, { value: "cmyk", label: "cmyk" }],
    },
    transferParam,
  ],
  output: [
    ...renderOutput("image_url"),
  ],

  async execute(input, ctx) {
    const modifications = compact({
      width: input.width,
      height: input.height,
      filename: input.filename,
      image_format: input.image_format,
      dpi: input.dpi,
      color_mode: input.color_mode,
    });
    return await new PlacidClient(ctx).json("/images", {
      method: "POST",
      body: compact({
        template_uuid: required(input.template_uuid, "template_uuid"),
        layers: asOptionalJson(input.layers, "layers"),
        webhook_success: input.webhook_success,
        create_now: input.create_now,
        passthrough: looseValue(input.passthrough),
        modifications: Object.keys(modifications).length ? modifications : undefined,
        transfer: asOptionalJson(input.transfer, "transfer"),
      }),
    });
  },
};

export default action;
