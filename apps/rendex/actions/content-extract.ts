import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, RendexClient } from "../lib/client.ts";

/**
 * `POST /v1/extract` — reader-mode content of a URL (Markdown, JSON or cleaned HTML) from the
 * fully rendered page. Returns `url, format, content, title, byline, excerpt, siteName,
 * length, loadTimeMs`; 422 `EXTRACTION_FAILED` when the page has no article-like content.
 */
interface Input {
  url: string;
  extractFormat?: string;
  waitUntil?: string;
  timeout?: number;
  device?: string;
  blockCookieBanners?: boolean;
  hideSelectors?: unknown;
}

const contentExtract: ActionDefinition<Input> = {
  key: "content-extract",
  type: "read",
  resource: "content",
  title: "Extract Page Content",
  description: "Turn a web page into clean reader-mode Markdown, JSON or HTML.",
  params: [
    { key: "url", label: "URL", type: "string", required: true },
    {
      key: "extractFormat",
      label: "Format",
      type: "select",
      options: [
        { value: "markdown", label: "markdown" },
        { value: "json", label: "json" },
        { value: "html", label: "html" },
      ],
      hint: "Default markdown.",
    },
    {
      key: "waitUntil",
      label: "Wait until",
      type: "select",
      options: ["load", "domcontentloaded", "networkidle0", "networkidle2"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    { key: "timeout", label: "Timeout (s)", type: "number", hint: "5–60." },
    {
      key: "device",
      label: "Device preset",
      type: "select",
      options: ["desktop", "iphone_15", "iphone_se", "pixel_8", "ipad", "ipad_pro"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    { key: "blockCookieBanners", label: "Block cookie banners", type: "boolean" },
    {
      key: "hideSelectors",
      label: "Hide selectors",
      type: "json",
      hint: "JSON array of CSS selectors (max 50).",
    },
  ],
  output: [
    { key: "url", type: "string", label: "URL" },
    { key: "format", type: "string", label: "Format" },
    { key: "content", type: "string", label: "Extracted content" },
    { key: "title", type: "string", label: "Title" },
    { key: "byline", type: "string", label: "Byline" },
    { key: "excerpt", type: "string", label: "Excerpt" },
    { key: "siteName", type: "string", label: "Site name" },
    { key: "length", type: "number", label: "Content length" },
    { key: "loadTimeMs", type: "number", label: "Load time in ms" },
  ],

  execute(input, ctx) {
    const url = String(input.url ?? "").trim();
    if (!url) throw new Error("URL is required");
    const body = compact({
      url,
      extractFormat: input.extractFormat,
      waitUntil: input.waitUntil,
      timeout: input.timeout,
      device: input.device,
      blockCookieBanners: input.blockCookieBanners,
      hideSelectors: asOptionalJson(input.hideSelectors, "Hide selectors"),
    });
    return new RendexClient(ctx).json("/extract", { method: "POST", body });
  },
};

export default contentExtract;
