import type { ActionDefinition } from "@w6w/types";
import { compact, IMAGE_OUTPUT, QuickChartClient } from "../lib/client.ts";

interface Input {
  type: string;
  text: string;
  format?: string;
  width?: number;
  height?: number;
  scale?: number;
  includeText?: boolean;
  rotate?: string;
}

/**
 * `POST /barcode` — renders a barcode. `type` is a bwip-js symbology name (`code128`, `upca`,
 * `datamatrix`, ...). A wrong type or unencodable text is HTTP 400 with the message in
 * `X-quickchart-error` and an error IMAGE as the body — even when `svg` was requested.
 */
const barcodeRender: ActionDefinition<Input> = {
  key: "barcode-render",
  type: "perform",
  resource: "barcode",
  title: "Render Barcode",
  description: "Render a barcode (Code 128, EAN, UPC, Data Matrix and 100+ more) to an image.",
  idempotent: true,
  requiresAuth: false,
  params: [
    {
      key: "type",
      label: "Barcode type",
      type: "string",
      required: true,
      hint: "A symbology name such as code128, code39, upca, ean13, datamatrix, azteccode. The " +
        "full list is in QuickChart's Barcode API docs.",
    },
    { key: "text", label: "Text", type: "string", required: true, hint: "The data to encode." },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "png",
      options: [{ value: "png", label: "PNG" }, { value: "svg", label: "SVG" }],
    },
    { key: "width", label: "Width", type: "number", validation: { min: 1, integer: true } },
    { key: "height", label: "Height", type: "number", validation: { min: 1, integer: true } },
    { key: "scale", label: "Scale", type: "number", validation: { min: 1, integer: true } },
    { key: "includeText", label: "Include human-readable text", type: "boolean" },
    {
      key: "rotate",
      label: "Rotation",
      type: "select",
      options: [
        { value: "N", label: "Normal" },
        { value: "R", label: "Right (90°)" },
        { value: "L", label: "Left (270°)" },
        { value: "I", label: "Inverted (180°)" },
      ],
    },
  ],
  output: IMAGE_OUTPUT,

  async execute(input, ctx) {
    return await new QuickChartClient(ctx).image(
      "/barcode",
      compact({ ...input, format: input.format ?? "png" }),
      "barcode",
    );
  },
};

export default barcodeRender;
