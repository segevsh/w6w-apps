import type { ActionDefinition } from "@w6w/types";
import { ApiTemplateClient } from "../lib/client.ts";

interface Input {
  templateId: string;
  data: Record<string, unknown>;
  outputImageType?: "all" | "jpegOnly" | "pngOnly";
  expiration?: number;
  meta?: string;
}

interface Output {
  status?: string;
  download_url?: string;
  download_url_png?: string;
  template_id?: string;
  transaction_ref?: string;
  [key: string]: unknown;
}

/**
 * POST /v2/create-image — render a JPEG/PNG image from a template, filling in
 * its layers from `data`. This mirrors the vendor's "overrides" concept: `data`
 * is the JSON payload of layer-name → value that the template interpolates.
 */
const createImage: ActionDefinition<Input, Output> = {
  key: "create-image",
  type: "perform",
  resource: "image",
  title: "Create Image",
  description: "Render a JPEG/PNG image from an APITemplate.io template.",
  idempotent: false,
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "From the APITemplate.io dashboard, or the List Templates action.",
    },
    {
      key: "data",
      label: "Template data",
      type: "json",
      required: true,
      hint: 'Layer overrides, e.g. `{ "text_1": "Hello" }`. Shape depends on the template.',
    },
    {
      key: "outputImageType",
      label: "Output image type",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "Both JPEG and PNG" },
        { value: "jpegOnly", label: "JPEG only" },
        { value: "pngOnly", label: "PNG only" },
      ],
    },
    {
      key: "expiration",
      label: "Expiration (minutes)",
      type: "number",
      hint: "How long the generated file stays on the CDN, 0-10080. Omit for the account default.",
      validation: { min: 0, max: 10080, integer: true },
    },
    {
      key: "meta",
      label: "Meta",
      type: "string",
      hint: "Opaque reference echoed back on the response, e.g. an internal record id.",
    },
  ],
  output: [
    { key: "download_url", type: "string", label: "Download URL (JPEG)" },
    { key: "download_url_png", type: "string", label: "Download URL (PNG)" },
    { key: "transaction_ref", type: "string", label: "Transaction reference" },
  ],

  execute(input, ctx) {
    const client = new ApiTemplateClient(ctx);
    return client.request<Output>("/v2/create-image", {
      method: "POST",
      query: {
        template_id: input.templateId,
        output_image_type: input.outputImageType,
        expiration: input.expiration,
        meta: input.meta,
      },
      body: input.data,
    });
  },
};

export default createImage;
