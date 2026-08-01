import type { ActionDefinition } from "@w6w/types";
import { FigmaClient } from "../lib/client.ts";

interface Input {
  fileKey: string;
  ids: string;
  scale?: number;
  format?: "jpg" | "png" | "svg" | "pdf";
  version?: string;
  svgIncludeId?: boolean;
  svgSimplifyStroke?: boolean;
  useAbsoluteBounds?: boolean;
}

/**
 * GET /v1/images/{file_key} — render specific nodes to images and return
 * short-lived (30 day) download URLs. Requires `file_content:read`.
 */
const getImages: ActionDefinition<Input> = {
  key: "get-images",
  type: "read",
  resource: "image",
  title: "Get Images",
  description: "Render one or more nodes to images (PNG/JPG/SVG/PDF) and return download URLs.",
  params: [
    { key: "fileKey", label: "File key", type: "string", required: true },
    {
      key: "ids",
      label: "Node IDs",
      type: "string",
      required: true,
      hint: 'Comma-separated node IDs to render, e.g. "1:2,1:3".',
    },
    {
      key: "scale",
      label: "Scale",
      type: "number",
      default: 1,
      validation: { min: 0.01, max: 4 },
      hint: "Image scaling factor, 0.01-4.",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "png",
      options: [
        { label: "PNG", value: "png" },
        { label: "JPG", value: "jpg" },
        { label: "SVG", value: "svg" },
        { label: "PDF", value: "pdf" },
      ],
    },
    { key: "version", label: "Version ID", type: "string" },
    {
      key: "svgIncludeId",
      label: "SVG: include node id",
      type: "boolean",
      default: false,
      hint: "Only applies when format is SVG.",
    },
    {
      key: "svgSimplifyStroke",
      label: "SVG: simplify stroke",
      type: "boolean",
      default: true,
      hint: "Only applies when format is SVG.",
    },
    {
      key: "useAbsoluteBounds",
      label: "Use absolute bounds",
      type: "boolean",
      default: false,
      hint: "Render at the node's full size, ignoring clipping.",
    },
  ],
  output: [
    { key: "err", type: "string", label: "Error, if any" },
    { key: "images", type: "object", label: "Node ID -> image URL" },
  ],

  execute(input, ctx) {
    const client = new FigmaClient(ctx);
    return client.request(`/v1/images/${encodeURIComponent(input.fileKey)}`, {
      query: {
        ids: input.ids,
        scale: input.scale,
        format: input.format,
        version: input.version,
        svg_include_id: input.svgIncludeId,
        svg_simplify_stroke: input.svgSimplifyStroke,
        use_absolute_bounds: input.useAbsoluteBounds,
      },
    });
  },
};

export default getImages;
