import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient } from "../lib/client.ts";
import {
  assertUrlXorHtml,
  buildPageBody,
  buildQuery,
  htmlParam,
  type PageInput,
  type QueryInput,
  queryParams,
  requestOverridesParam,
  requestParams,
  urlParam,
  withOverrides,
} from "../lib/params.ts";

interface Input extends PageInput, QueryInput {
  type?: string;
  quality?: number;
  fullPage?: boolean;
  omitBackground?: boolean;
  selector?: string;
  scrollPage?: boolean;
}

/**
 * `POST /screenshot` answers with the image bytes (`image/png`, `image/jpeg` or
 * `image/webp`, by `options.type`). A workflow step cannot carry raw bytes, so the
 * image comes back as base64 with its content type and size.
 */
const screenshot: ActionDefinition<Input> = {
  key: "screenshot",
  type: "read",
  resource: "page",
  title: "Take Screenshot",
  description:
    "Render a URL or raw HTML in a headless browser and capture a PNG, JPEG or WebP screenshot, " +
    "returned as base64.",
  params: [
    urlParam,
    htmlParam,
    {
      key: "type",
      label: "Image format",
      type: "select",
      default: "png",
      options: [
        { value: "png", label: "PNG" },
        { value: "jpeg", label: "JPEG" },
        { value: "webp", label: "WebP" },
      ],
    },
    {
      key: "quality",
      label: "Quality (0-100)",
      type: "number",
      validation: { integer: true, min: 0, max: 100 },
      hint: "JPEG and WebP only; the vendor ignores it for PNG, so this app refuses the pairing.",
    },
    {
      key: "fullPage",
      label: "Full page",
      type: "boolean",
      hint: "Capture the whole scrollable page, not just the viewport.",
    },
    {
      key: "selector",
      label: "Capture one element",
      type: "string",
      hint: "A CSS selector. The shot is cropped to that element's bounding box.",
    },
    {
      key: "scrollPage",
      label: "Scroll page first",
      type: "boolean",
      hint: "Scroll through the page before capturing so lazy-loaded images render.",
    },
    {
      key: "omitBackground",
      label: "Transparent background",
      type: "boolean",
      hint: "Hide the default white background (PNG/WebP).",
    },
    ...requestParams,
    ...queryParams,
    requestOverridesParam,
  ],
  output: [
    { key: "contentType", type: "string", label: "Image MIME type" },
    { key: "sizeBytes", type: "number", label: "Image size in bytes" },
    { key: "base64", type: "string", label: "Image bytes, base64-encoded" },
  ],

  async execute(input, ctx) {
    assertUrlXorHtml(input);
    if (input.quality !== undefined && input.type === "png") {
      throw new Error("Quality applies to JPEG and WebP only; Browserless ignores it for PNG");
    }
    const options = {
      type: input.type,
      quality: input.quality,
      fullPage: input.fullPage ? true : undefined,
      omitBackground: input.omitBackground ? true : undefined,
    };
    const body = withOverrides({
      ...buildPageBody(input),
      options: Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined)),
      selector: input.selector?.trim() || undefined,
      scrollPage: input.scrollPage ? true : undefined,
    }, input.requestOverrides);
    const bin = await new BrowserlessClient(ctx).binary("/screenshot", {
      method: "POST",
      query: buildQuery(input),
      body,
    });
    return { contentType: bin.contentType, sizeBytes: bin.sizeBytes, base64: bin.base64 };
  },
};

export default screenshot;
