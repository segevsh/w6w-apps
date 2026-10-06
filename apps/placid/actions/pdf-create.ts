import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, looseValue, PlacidClient, requireJson } from "../lib/client.ts";
import { passthroughParam, renderOutput, transferParam, webhookParam } from "../lib/params.ts";

interface Input {
  pages: unknown;
  webhook_success?: string;
  passthrough?: unknown;
  filename?: string;
  image_quality?: string;
  dpi?: number;
  color_mode?: string;
  color_profile?: string;
  transfer?: unknown;
}

/** `POST /pdfs` — queue a PDF from one or more template pages, merged in order. 1 PDF page = 2 credits. */
const action: ActionDefinition<Input, unknown> = {
  key: "pdf-create",
  type: "perform",
  resource: "pdf",
  title: "Create PDF",
  description:
    "Render a PDF from one or more template pages (merged in order). Asynchronous; costs 2 credits per page and is not safe to retry blindly.",
  idempotent: false,
  params: [
    {
      key: "pages",
      label: "Pages",
      type: "json",
      required: true,
      hint:
        'Array of pages, each `{"template_uuid":"…","layers":{"title":{"text":"…"}}}`. Pages are merged in the order given.',
    },
    webhookParam,
    passthroughParam,
    { key: "filename", label: "Filename", type: "string", advanced: true },
    {
      key: "image_quality",
      label: "Image quality",
      type: "select",
      advanced: true,
      options: [
        { value: "high", label: "high (default)" },
        { value: "medium", label: "medium" },
        { value: "low", label: "low" },
      ],
    },
    {
      key: "dpi",
      label: "DPI",
      type: "select",
      advanced: true,
      options: [
        { value: 96, label: "96 (default)" },
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
    {
      key: "color_profile",
      label: "Color profile (beta)",
      type: "string",
      advanced: true,
      hint:
        "Beta, by request to Placid: `none` (default), `rgb-profile-1`..`rgb-profile-3`, `cmyk-profile-1`..`cmyk-profile-5`.",
    },
    transferParam,
  ],
  output: [
    ...renderOutput("pdf_url"),
  ],

  async execute(input, ctx) {
    const pages = requireJson<unknown[]>(input.pages, "pages");
    if (!Array.isArray(pages) || pages.length === 0) {
      throw new Error("`pages` must be a non-empty array of {template_uuid, layers}");
    }
    const modifications = compact({
      filename: input.filename,
      image_quality: input.image_quality,
      dpi: input.dpi,
      color_mode: input.color_mode,
      color_profile: input.color_profile,
    });
    return await new PlacidClient(ctx).json("/pdfs", {
      method: "POST",
      body: compact({
        pages,
        webhook_success: input.webhook_success,
        passthrough: looseValue(input.passthrough),
        modifications: Object.keys(modifications).length ? modifications : undefined,
        transfer: asOptionalJson(input.transfer, "transfer"),
      }),
    });
  },
};

export default action;
