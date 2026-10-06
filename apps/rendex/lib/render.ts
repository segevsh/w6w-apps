import type { ActionDefinition, Param } from "@w6w/types";
import {
  CAPTURE_OUTPUT,
  CAPTURE_PARAMS,
  captureBody,
  type CaptureInput,
  DATA_PARAM,
  type SourceKind,
} from "./capture.ts";
import { asOptionalJson, RendexClient } from "./client.ts";

type RenderInput = CaptureInput & { source: string; data?: unknown };

const SOURCE: Record<
  SourceKind,
  { title: string; label: string; type: Param["type"]; hint: string }
> = {
  url: {
    title: "Render URL",
    label: "URL",
    type: "string",
    hint: "A public http(s) page. Private IPs are rejected (400 INVALID_URL).",
  },
  html: {
    title: "Render HTML",
    label: "HTML",
    type: "code",
    hint: "Raw HTML, max 5 MB. Pair with Template data to fill Mustache placeholders.",
  },
  markdown: {
    title: "Render Markdown",
    label: "Markdown",
    type: "text",
    hint: "Markdown, max 5 MB, rendered with default typography. Pair with Template data " +
      "to fill Mustache placeholders.",
  },
};

/**
 * `POST /v1/screenshot/json` with exactly one of `url`, `html` or `markdown` — the API
 * answers 400 when none or several are sent. `data` (Mustache) is valid only with html or
 * markdown, so the URL action does not offer it.
 */
export function renderAction(kind: SourceKind): ActionDefinition<RenderInput> {
  const s = SOURCE[kind];
  return {
    key: `render-${kind}`,
    type: "perform",
    // Each call spends a credit and the API takes no idempotency key.
    idempotent: false,
    resource: "render",
    title: s.title,
    description: kind === "url"
      ? "Screenshot a web page, or turn it into a PDF. Returns the image as base64."
      : `Render ${s.label} to an image or PDF, optionally filling a Mustache template. ` +
        "Returns the image as base64.",
    params: [
      { key: "source", label: s.label, type: s.type, required: true, hint: s.hint },
      ...(kind === "url" ? [] : [DATA_PARAM]),
      ...CAPTURE_PARAMS,
    ],
    output: [...CAPTURE_OUTPUT],

    execute(input, ctx) {
      const source = String(input.source ?? "").trim();
      if (!source) throw new Error(`${s.label} is required`);
      const body: Record<string, unknown> = { [kind]: source, ...captureBody(input) };
      const data = asOptionalJson<Record<string, unknown>>(input.data, "Template data");
      if (data !== undefined && kind !== "url") body.data = data;
      return new RendexClient(ctx).json("/screenshot/json", { method: "POST", body });
    },
  };
}
