import type { ActionDefinition } from "@w6w/types";
import { HctiClient } from "../lib/client.ts";
import { buildBody, renderParams } from "../lib/render.ts";

/**
 * `POST /v1/image` with `url` — screenshot a public web page.
 *
 * Answers `{url, id}`. Needs `images:create`. The URL must be public HTTP(S). `headers`
 * are sent on the top-level navigation to the page's origin (and any
 * `additional_header_origins`), which is how a page behind a token is captured.
 *
 * Spends image credits; not retry-safe (see `image-create-html`).
 */
interface Input extends Record<string, unknown> {
  url: string;
}

const imageCreateUrl: ActionDefinition<Input> = {
  key: "image-create-url",
  type: "perform",
  resource: "image",
  title: "Create Image from URL",
  description: "Screenshot a public web page to an image (PNG, JPG, WebP) or PDF.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
    },
    { key: "css", label: "Injected CSS", type: "code", hint: "CSS injected into the loaded page." },
    {
      key: "full_screen",
      label: "Full page",
      type: "boolean",
      hint: "Capture the whole scrollable page.",
    },
    {
      key: "block_consent_banners",
      label: "Block cookie banners",
      type: "boolean",
    },
    {
      key: "headers",
      label: "Request headers",
      type: "json",
      hint: "Object of HTTP headers for the page's origin. Up to 20.",
    },
    ...renderParams,
  ],
  output: [
    { key: "id", type: "string", label: "Image ID" },
    { key: "url", type: "string", label: "Image URL" },
  ],

  execute(input, ctx) {
    if (!input.url) throw new Error("url is required");
    const body = buildBody(input, { url: input.url }, [
      "css",
      "full_screen",
      "block_consent_banners",
      "headers",
    ]);
    return new HctiClient(ctx).json("/image", { method: "POST", body });
  },
};

export default imageCreateUrl;
