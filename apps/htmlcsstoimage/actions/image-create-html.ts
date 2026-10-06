import type { ActionDefinition } from "@w6w/types";
import { HctiClient } from "../lib/client.ts";
import { buildBody, renderParams } from "../lib/render.ts";

/**
 * `POST /v1/image` with `html` (+ optional `css`) — render markup to an image.
 *
 * Answers `{url, id}`: the permanent CDN URL (png by default; swap the extension for
 * jpg/webp/pdf) and the image id. Needs the `images:create` permission. HTML fragments are
 * wrapped in a document; send a complete document to control the `<head>`.
 *
 * Each call spends image credits, and the vendor accepts no idempotency key — so this is
 * not retry-safe. `dedupe_duration_s` is the vendor's own guard: an identical request made
 * inside that window returns the existing image instead of rendering a new one.
 */
interface Input extends Record<string, unknown> {
  html: string;
  css?: string;
  google_fonts?: string;
}

const imageCreateHtml: ActionDefinition<Input> = {
  key: "image-create-html",
  type: "perform",
  resource: "image",
  title: "Create Image from HTML/CSS",
  description: "Render HTML and CSS to an image (PNG, JPG, WebP) or PDF and get its URL.",
  idempotent: false,
  params: [
    { key: "html", label: "HTML", type: "code", required: true },
    { key: "css", label: "CSS", type: "code" },
    {
      key: "google_fonts",
      label: "Google Fonts",
      type: "string",
      hint: "Pipe-separated families, e.g. `Roboto|Open Sans`; reference them in your CSS.",
    },
    ...renderParams,
  ],
  output: [
    { key: "id", type: "string", label: "Image ID" },
    { key: "url", type: "string", label: "Image URL" },
  ],

  execute(input, ctx) {
    if (!input.html) throw new Error("html is required");
    const body = buildBody(input, { html: input.html }, ["css", "google_fonts"]);
    return new HctiClient(ctx).json("/image", { method: "POST", body });
  },
};

export default imageCreateHtml;
