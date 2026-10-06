import type { ActionDefinition } from "@w6w/types";
import { IMAGE_OUTPUT, QuickChartClient } from "../lib/client.ts";
import { QR_PARAMS, qrBody } from "../lib/params.ts";
import type { QrInput } from "../lib/params.ts";

/** `POST /qr` — renders a QR code image. A centre image cannot be combined with SVG output. */
const qrRender: ActionDefinition<QrInput> = {
  key: "qr-render",
  type: "perform",
  resource: "qr",
  title: "Render QR Code",
  description: "Render a QR code (optionally styled, with a centre image or caption) to an image.",
  idempotent: true,
  requiresAuth: false,
  params: [
    ...QR_PARAMS,
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "png",
      options: [
        { value: "png", label: "PNG" },
        { value: "svg", label: "SVG" },
        { value: "jpg", label: "JPEG" },
      ],
    },
  ],
  output: IMAGE_OUTPUT,

  async execute(input, ctx) {
    return await new QuickChartClient(ctx).image(
      "/qr",
      qrBody({ ...input, format: input.format ?? "png" }),
      "qr",
    );
  },
};

export default qrRender;
