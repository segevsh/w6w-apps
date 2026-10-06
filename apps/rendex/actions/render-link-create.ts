import type { ActionDefinition } from "@w6w/types";
import { CAPTURE_PARAMS, captureBody, type CaptureInput, DATA_PARAM } from "../lib/capture.ts";
import { asOptionalJson, RendexClient } from "../lib/client.ts";

/**
 * `POST /v1/render/link` — mint a signed, cached, public URL for a render (an `og:image`, an
 * `<img src>`). The body is the capture parameters with exactly one of url/html/markdown,
 * plus `expiresIn` (3600–2592000, default 30 days). Returns `{url, expiresAt, format,
 * cacheTtl}`. Rendering happens on the first GET of the link, so minting spends no credit
 * here; the link owner is charged per cache-miss render.
 */
interface Input extends CaptureInput {
  url?: string;
  html?: string;
  markdown?: string;
  data?: unknown;
  expiresIn?: number;
}

const renderLinkCreate: ActionDefinition<Input> = {
  key: "render-link-create",
  type: "perform",
  idempotent: false,
  resource: "render-link",
  title: "Create Render Link",
  description: "Mint a signed, CDN-cached URL for a render, ready for og:image or <img>.",
  params: [
    { key: "url", label: "URL", type: "string", hint: "Exactly one of URL, HTML or Markdown." },
    { key: "html", label: "HTML", type: "code" },
    { key: "markdown", label: "Markdown", type: "text" },
    DATA_PARAM,
    {
      key: "expiresIn",
      label: "Expires in (s)",
      type: "number",
      hint: "3600–2592000. Default 30 days.",
    },
    ...CAPTURE_PARAMS,
  ],
  output: [
    { key: "url", type: "string", label: "Signed render URL" },
    { key: "expiresAt", type: "string", label: "Expiry (ISO 8601)" },
    { key: "format", type: "string", label: "Output format" },
    { key: "cacheTtl", type: "number", label: "Cache TTL in seconds" },
  ],

  execute(input, ctx) {
    const sources = (["url", "html", "markdown"] as const).filter((k) => input[k]);
    if (sources.length !== 1) {
      throw new Error("Provide exactly one of URL, HTML or Markdown");
    }
    const body: Record<string, unknown> = {
      [sources[0]]: input[sources[0]],
      ...captureBody(input),
    };
    const data = asOptionalJson<Record<string, unknown>>(input.data, "Template data");
    if (data !== undefined) body.data = data;
    if (input.expiresIn !== undefined && input.expiresIn !== null) {
      body.expiresIn = input.expiresIn;
    }
    return new RendexClient(ctx).json("/render/link", { method: "POST", body });
  },
};

export default renderLinkCreate;
