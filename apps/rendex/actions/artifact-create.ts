import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, RendexClient } from "../lib/client.ts";

/**
 * `POST /v1/artifact` — Markdown or HTML plus a branding theme to a branded PDF, a PNG and a
 * hosted share page. Each requested format costs 1 credit. Returns short-lived signed
 * `pdfUrl` / `pngUrl` (per requested format), `shareUrl` and `expiresAt`.
 */
interface Input {
  content: string;
  inputFormat?: string;
  formats?: string[];
  branding?: unknown;
  pageSetup?: unknown;
  data?: unknown;
  expiresIn?: number;
}

const artifactCreate: ActionDefinition<Input> = {
  key: "artifact-create",
  type: "perform",
  idempotent: false,
  resource: "artifact",
  title: "Create Branded Artifact",
  description: "Turn Markdown or HTML into a branded PDF and/or PNG with hosted, shareable URLs.",
  params: [
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      hint: "Markdown (default) or an HTML body fragment. Up to about 4 MB.",
    },
    {
      key: "inputFormat",
      label: "Input format",
      type: "select",
      options: [{ value: "markdown", label: "markdown" }, { value: "html", label: "html" }],
    },
    {
      key: "formats",
      label: "Output formats",
      type: "multiselect",
      options: [{ value: "pdf", label: "pdf" }, { value: "png", label: "png" }],
      hint: "Default both; each format is 1 credit.",
    },
    {
      key: "branding",
      label: "Branding",
      type: "json",
      hint: 'JSON {logo?, accentColor?, font?, header?, footer?}, e.g. {"header": "Acme"}.',
    },
    {
      key: "pageSetup",
      label: "Page setup",
      type: "json",
      hint: "JSON {size?, orientation?, margin?, scale?, width?, height?, fullPage?}.",
    },
    {
      key: "data",
      label: "Template data",
      type: "json",
      hint: "Mustache data applied to content.",
    },
    {
      key: "expiresIn",
      label: "Expires in (s)",
      type: "number",
      hint: "3600–2592000. Default 24 hours.",
    },
  ],
  output: [
    { key: "pdfUrl", type: "string", label: "Signed PDF URL" },
    { key: "pngUrl", type: "string", label: "Signed PNG URL" },
    { key: "shareUrl", type: "string", label: "Hosted share page URL" },
    { key: "expiresAt", type: "string", label: "Expiry (ISO 8601)" },
  ],

  execute(input, ctx) {
    if (!String(input.content ?? "").trim()) throw new Error("Content is required");
    const body = compact({
      content: input.content,
      inputFormat: input.inputFormat,
      formats: input.formats,
      branding: asOptionalJson(input.branding, "Branding"),
      pageSetup: asOptionalJson(input.pageSetup, "Page setup"),
      data: asOptionalJson(input.data, "Template data"),
      expiresIn: input.expiresIn,
    });
    return new RendexClient(ctx).json("/artifact", { method: "POST", body });
  },
};

export default artifactCreate;
