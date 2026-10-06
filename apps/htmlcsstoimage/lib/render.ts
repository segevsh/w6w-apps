import type { Param } from "@w6w/types";
import { asOptionalJson, compact } from "./client.ts";

/**
 * Render options shared by the three image-creation actions.
 *
 * Param keys are the vendor's own snake_case field names, so the request body is the
 * params with the empty ones dropped — what the docs describe is what is sent.
 */

const NUMERIC = [
  "device_scale",
  "max_wait_ms",
  "ms_delay",
  "viewport_width",
  "viewport_height",
  "dedupe_duration_s",
  "jumbo_max_width",
  "jumbo_max_height",
] as const;

const JSON_FIELDS = ["metadata", "pdf_options", "headers"] as const;

export const FORMAT_OPTIONS = [
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
  { value: "pdf", label: "PDF" },
];

/** Options accepted by HTML/CSS, URL and templated requests alike. */
export const renderParams: Param[] = [
  {
    key: "format",
    label: "Format",
    type: "select",
    options: FORMAT_OPTIONS,
    hint: "File extension on the returned URL. It does not stop you rendering other formats later.",
  },
  {
    key: "device_scale",
    label: "Device scale",
    type: "number",
    hint: "Pixel ratio, 0.1 to 3. HTML and template renders default to 2, URL renders to 1.",
  },
  {
    key: "viewport_width",
    label: "Viewport width",
    type: "number",
    hint: "1–6000. Disables auto-cropping; must be sent together with the viewport height.",
  },
  {
    key: "viewport_height",
    label: "Viewport height",
    type: "number",
    hint: "1–6000. Must be sent together with the viewport width.",
  },
  {
    key: "selector",
    label: "CSS selector",
    type: "string",
    hint: "Crop the image to this element.",
  },
  {
    key: "ms_delay",
    label: "Delay (ms)",
    type: "number",
    hint: "Extra time before the screenshot so JavaScript can run. 0–10000.",
  },
  {
    key: "max_wait_ms",
    label: "Max wait (ms)",
    type: "number",
    hint: "Cap on waiting for a page that keeps loading. 500–10000, limited by plan.",
  },
  {
    key: "color_scheme",
    label: "Color scheme",
    type: "select",
    options: [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }],
  },
  {
    key: "media_type",
    label: "CSS media type",
    type: "select",
    options: [{ value: "screen", label: "Screen" }, { value: "print", label: "Print" }],
  },
  {
    key: "timezone",
    label: "Timezone",
    type: "string",
    hint: "An IANA timezone, e.g. Europe/Paris.",
  },
  {
    key: "transparent_background",
    label: "Transparent background",
    type: "boolean",
  },
  {
    key: "render_when_ready",
    label: "Wait for ScreenshotReady()",
    type: "boolean",
    hint: "The image fails if the page never calls ScreenshotReady().",
  },
  {
    key: "dedupe_duration_s",
    label: "Duplicate window (seconds)",
    type: "number",
    hint:
      "Reuse an identical image created within this many seconds instead of rendering (and billing) again. Plan-dependent.",
  },
  {
    key: "metadata",
    label: "Metadata",
    type: "json",
    hint: "Custom string key-value pairs stored with the image.",
  },
  {
    key: "pdf_options",
    label: "PDF options",
    type: "json",
    hint:
      "{page_width, page_height, scale, margins:[t,r,b,l], print_background} when format is pdf.",
  },
];

/**
 * Build the request body from the action's input: `keys` are the fields this action
 * owns, everything else in {@link renderParams} is optional.
 */
export function buildBody(
  input: Record<string, unknown>,
  required: Record<string, unknown> = {},
  extraKeys: readonly string[] = [],
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const keys = [
    ...renderParams.map((p) => p.key),
    ...extraKeys,
  ];
  for (const key of keys) {
    let v = input[key];
    if (v === undefined || v === null || v === "") continue;
    if ((NUMERIC as readonly string[]).includes(key)) {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error(`${key} must be a number`);
      v = n;
    } else if ((JSON_FIELDS as readonly string[]).includes(key)) {
      v = asOptionalJson(v, key);
    }
    body[key] = v;
  }
  if ((body.viewport_width === undefined) !== (body.viewport_height === undefined)) {
    throw new Error("viewport_width and viewport_height must be supplied together");
  }
  if ((body.jumbo_max_width === undefined) !== (body.jumbo_max_height === undefined)) {
    throw new Error("jumbo_max_width and jumbo_max_height must be supplied together");
  }
  return { ...compact(required), ...body };
}

/** Fields a template (and a template version) is saved with — `TemplateRequest`. */
export const templateParams: Param[] = [
  {
    key: "html",
    label: "HTML",
    type: "code",
    required: true,
    hint:
      "Must contain at least one Handlebars placeholder such as {{title}} and compile as valid Handlebars.",
  },
  { key: "name", label: "Name", type: "string", hint: "Up to 64 characters." },
  { key: "description", label: "Description", type: "string", hint: "Up to 1024 characters." },
  {
    key: "css",
    label: "CSS",
    type: "code",
    hint: "Handlebars is not supported in CSS; inline dynamic CSS in the HTML.",
  },
  { key: "google_fonts", label: "Google Fonts", type: "string", hint: "Pipe-separated families." },
  ...renderParams.filter((p) =>
    [
      "device_scale",
      "viewport_width",
      "viewport_height",
      "selector",
      "ms_delay",
      "max_wait_ms",
      "color_scheme",
      "media_type",
      "timezone",
      "transparent_background",
      "render_when_ready",
    ].includes(p.key)
  ),
];

/** Body for `POST /v1/template[/{id}]`, built from only the keys `TemplateRequest` has. */
export function buildTemplateBody(input: Record<string, unknown>): Record<string, unknown> {
  const own = ["name", "description", "css", "google_fonts"] as const;
  const shared = buildBody(
    Object.fromEntries(
      Object.entries(input).filter(([k]) => templateParams.some((p) => p.key === k)),
    ),
    { html: input.html },
    own,
  );
  return shared;
}
