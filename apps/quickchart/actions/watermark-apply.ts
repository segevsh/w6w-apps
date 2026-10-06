import type { ActionDefinition } from "@w6w/types";
import { compact, IMAGE_OUTPUT, QuickChartClient } from "../lib/client.ts";

interface Input {
  mainImageUrl: string;
  markImageUrl: string;
  opacity?: number;
  position?: string;
  margin?: number;
  markRatio?: number;
}

/** `POST /watermark` — overlays one public image on another and answers a PNG. */
const watermarkApply: ActionDefinition<Input> = {
  key: "watermark-apply",
  type: "perform",
  resource: "watermark",
  title: "Add Watermark",
  description: "Overlay a watermark or logo image onto a base image.",
  idempotent: true,
  requiresAuth: false,
  params: [
    {
      key: "mainImageUrl",
      label: "Base image URL",
      type: "string",
      required: true,
      hint: "Must be publicly reachable.",
    },
    {
      key: "markImageUrl",
      label: "Watermark image URL",
      type: "string",
      required: true,
      hint: "Must be publicly reachable.",
    },
    {
      key: "position",
      label: "Position",
      type: "select",
      default: "bottomRight",
      options: [
        "topLeft",
        "topMiddle",
        "topRight",
        "middleLeft",
        "center",
        "middleRight",
        "bottomLeft",
        "bottomMiddle",
        "bottomRight",
      ].map((p) => ({ value: p, label: p })),
    },
    {
      key: "opacity",
      label: "Opacity",
      type: "number",
      hint: "0 to 1. Defaults to 1.",
      validation: { min: 0, max: 1 },
    },
    { key: "margin", label: "Margin (px)", type: "number", validation: { min: 0 } },
    {
      key: "markRatio",
      label: "Watermark width ratio",
      type: "number",
      hint: "Watermark width as a fraction of the base image width.",
      validation: { min: 0, max: 1 },
    },
  ],
  output: IMAGE_OUTPUT,

  async execute(input, ctx) {
    return await new QuickChartClient(ctx).image("/watermark", compact({ ...input }), "watermark");
  },
};

export default watermarkApply;
