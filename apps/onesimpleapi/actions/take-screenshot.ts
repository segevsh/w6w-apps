import type { ActionDefinition } from "@w6w/types";
import { OneSimpleApiClient } from "../lib/client.ts";

interface Input {
  url: string;
  screen?: string;
  full?: boolean;
  background?: boolean;
  force?: boolean;
}

interface Output {
  url?: string;
  width?: number;
  height?: number;
  full_page?: boolean;
  elapsed?: number;
  [key: string]: unknown;
}

/**
 * GET /api/screenshot — take a pixel-perfect screenshot of a webpage.
 *
 * Output fields are inferred from the vendor's documented CSV column names
 * ("URL, Width, Height, Full Page") rather than a JSON example — the docs
 * show no `output=json` sample for this endpoint. This inference is grounded:
 * the Email Validation endpoint's docs show both its CSV columns *and* a JSON
 * example side by side, and the JSON keys are exactly the snake_cased CSV
 * column names, so the same correspondence is used here.
 */
const takeScreenshot: ActionDefinition<Input, Output> = {
  key: "take-screenshot",
  type: "perform",
  resource: "website",
  title: "Take Screenshot",
  description: "Capture a screenshot of a webpage.",
  // The vendor reuses a previously taken screenshot of the same URL/options by
  // default (see `force`), so a retried call is safe.
  idempotent: true,
  params: [
    {
      key: "url",
      label: "Webpage URL",
      type: "string",
      required: true,
      hint: "The page to screenshot.",
    },
    {
      key: "screen",
      label: "Screen size",
      type: "select",
      hint: "Defaults to the vendor's standard desktop viewport.",
      options: [
        { value: "retina", label: "Retina (3070x1920)" },
        { value: "phone", label: "Phone (414x828)" },
        { value: "phone-landscape", label: "Phone landscape (828x414)" },
        { value: "tablet", label: "Tablet (768x1024)" },
        { value: "tablet-landscape", label: "Tablet landscape (1024x768)" },
        { value: "4k", label: "4K (3840x2160)" },
        { value: "8k", label: "8K (7680x4320)" },
      ],
    },
    {
      key: "full",
      label: "Full page",
      type: "boolean",
      default: false,
      hint: "Capture the whole scrollable length of the page, not just the viewport.",
    },
    {
      key: "background",
      label: "Include background",
      type: "boolean",
      default: true,
      hint: "Include background images and colors.",
    },
    {
      key: "force",
      label: "Force refresh",
      type: "boolean",
      default: false,
      hint: "Retake the screenshot instead of reusing a previously cached one.",
    },
  ],
  output: [
    { key: "url", type: "string", label: "Screenshot image URL" },
    { key: "width", type: "number", label: "Width" },
    { key: "height", type: "number", label: "Height" },
  ],

  execute(input, ctx) {
    const client = new OneSimpleApiClient(ctx);
    return client.request<Output>("/screenshot", {
      query: {
        url: input.url,
        screen: input.screen,
        full: input.full === undefined ? undefined : (input.full ? "yes" : "no"),
        background: input.background === undefined ? undefined : (input.background ? "yes" : "no"),
        force: input.force ? "yes" : undefined,
      },
    });
  },
};

export default takeScreenshot;
