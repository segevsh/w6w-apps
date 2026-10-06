import type { Param } from "@w6w/types";
import { asOptionalJson, compact } from "./client.ts";

/**
 * The capture parameters shared by `POST /v1/screenshot/json`, `POST /v1/render/link` and the
 * batch `defaults` object — all from the API reference's POST /v1/screenshot table.
 * `async`, `webhookUrl`, `hosted` and `extract` are left out on purpose: their responses are
 * not documented for the JSON endpoint, and `render/link` rejects them.
 */
export interface CaptureInput {
  format?: string;
  width?: number;
  height?: number;
  fullPage?: boolean;
  darkMode?: boolean;
  blockAds?: boolean;
  quality?: number;
  delay?: number;
  deviceScaleFactor?: number;
  timeout?: number;
  waitUntil?: string;
  waitForSelector?: string;
  bestAttempt?: boolean;
  selector?: string;
  device?: string;
  hideSelectors?: unknown;
  blockCookieBanners?: boolean;
  blockResourceTypes?: string[];
  resizeWidth?: number;
  resizeHeight?: number;
  css?: string;
  js?: string;
  cookies?: unknown;
  headers?: unknown;
  userAgent?: string;
  pdfFormat?: string;
  pdfLandscape?: boolean;
  pdfPrintBackground?: boolean;
  pdfScale?: number;
  pdfMargin?: unknown;
  geo?: string;
  geoCity?: string;
  geoState?: string;
  cacheTtl?: number;
}

const opt = (...values: string[]) => values.map((v) => ({ value: v, label: v }));

export const FORMAT_OPTIONS = opt("png", "jpeg", "webp", "pdf");

/** Params, in order. `required: false` throughout: every one has a server-side default. */
export const CAPTURE_PARAMS: Param[] = [
  {
    key: "format",
    label: "Format",
    type: "select",
    options: FORMAT_OPTIONS,
    hint: "png (default), jpeg, webp, or pdf.",
  },
  { key: "width", label: "Viewport width", type: "number", hint: "320–3840, default 1280." },
  { key: "height", label: "Viewport height", type: "number", hint: "240–2160, default 800." },
  {
    key: "fullPage",
    label: "Full page",
    type: "boolean",
    hint: "Capture the whole scroll height.",
  },
  { key: "darkMode", label: "Dark mode", type: "boolean" },
  { key: "blockAds", label: "Block ads and trackers", type: "boolean", hint: "Default on." },
  { key: "quality", label: "Quality", type: "number", hint: "JPEG/WebP only, 1–100, default 80." },
  { key: "delay", label: "Delay (ms)", type: "number", hint: "Wait after load, 0–10000." },
  {
    key: "deviceScaleFactor",
    label: "Device scale factor",
    type: "number",
    hint: "1–3, default 2 (retina).",
  },
  { key: "timeout", label: "Timeout (s)", type: "number", hint: "Navigation timeout, 5–60." },
  {
    key: "waitUntil",
    label: "Wait until",
    type: "select",
    options: opt("load", "domcontentloaded", "networkidle0", "networkidle2"),
    hint: "Default networkidle2.",
  },
  { key: "waitForSelector", label: "Wait for selector", type: "string" },
  {
    key: "bestAttempt",
    label: "Best attempt",
    type: "boolean",
    hint: "On timeout, return a partial capture instead of failing (default on).",
  },
  {
    key: "selector",
    label: "Capture selector",
    type: "string",
    hint: "Capture only this element.",
  },
  {
    key: "device",
    label: "Device preset",
    type: "select",
    options: opt("desktop", "iphone_15", "iphone_se", "pixel_8", "ipad", "ipad_pro"),
  },
  {
    key: "hideSelectors",
    label: "Hide selectors",
    type: "json",
    hint: 'JSON array of CSS selectors to hide, e.g. ["#chat", ".banner"] (max 50).',
  },
  { key: "blockCookieBanners", label: "Block cookie banners", type: "boolean" },
  {
    key: "blockResourceTypes",
    label: "Block resource types",
    type: "multiselect",
    options: opt("font", "image", "media", "stylesheet", "other"),
  },
  { key: "resizeWidth", label: "Resize width", type: "number", hint: "Image only, 16–3840." },
  { key: "resizeHeight", label: "Resize height", type: "number", hint: "Image only, 16–2160." },
  { key: "css", label: "Custom CSS", type: "code", hint: "Injected before capture (max 50 KB)." },
  { key: "js", label: "Custom JavaScript", type: "code", hint: "Run after load (max 50 KB)." },
  {
    key: "cookies",
    label: "Cookies",
    type: "json",
    hint: "JSON array of {name, value, domain?, path?, ...}. Needs a paid plan (Basic+).",
  },
  {
    key: "headers",
    label: "Request headers",
    type: "json",
    hint: 'JSON object of headers sent with the page request, e.g. {"X-Env": "staging"}.',
  },
  { key: "userAgent", label: "User agent", type: "string" },
  {
    key: "pdfFormat",
    label: "PDF page size",
    type: "select",
    options: opt("A4", "Letter", "Legal", "Tabloid", "A3"),
    hint: "Only with format pdf.",
  },
  { key: "pdfLandscape", label: "PDF landscape", type: "boolean" },
  { key: "pdfPrintBackground", label: "PDF print background", type: "boolean" },
  { key: "pdfScale", label: "PDF scale", type: "number", hint: "0.1–2." },
  {
    key: "pdfMargin",
    label: "PDF margin",
    type: "json",
    hint: 'JSON {top, right, bottom, left} in CSS units, e.g. {"top": "1in"}.',
  },
  { key: "geo", label: "Geo country", type: "string", hint: "ISO code. Pro and Enterprise only." },
  { key: "geoCity", label: "Geo city", type: "string", hint: "Requires a geo country." },
  { key: "geoState", label: "Geo state", type: "string", hint: "Requires a geo country." },
  {
    key: "cacheTtl",
    label: "Cache TTL (s)",
    type: "number",
    hint: "3600–2592000, default 86400.",
  },
];

/** The capture fields of an input, with unset ones dropped and JSON params parsed. */
export function captureBody(input: CaptureInput): Record<string, unknown> {
  return compact({
    format: input.format,
    width: input.width,
    height: input.height,
    fullPage: input.fullPage,
    darkMode: input.darkMode,
    blockAds: input.blockAds,
    quality: input.quality,
    delay: input.delay,
    deviceScaleFactor: input.deviceScaleFactor,
    timeout: input.timeout,
    waitUntil: input.waitUntil,
    waitForSelector: input.waitForSelector,
    bestAttempt: input.bestAttempt,
    selector: input.selector,
    device: input.device,
    hideSelectors: asOptionalJson(input.hideSelectors, "Hide selectors"),
    blockCookieBanners: input.blockCookieBanners,
    blockResourceTypes: input.blockResourceTypes,
    resizeWidth: input.resizeWidth,
    resizeHeight: input.resizeHeight,
    css: input.css,
    js: input.js,
    cookies: asOptionalJson(input.cookies, "Cookies"),
    headers: asOptionalJson(input.headers, "Request headers"),
    userAgent: input.userAgent,
    pdfFormat: input.pdfFormat,
    pdfLandscape: input.pdfLandscape,
    pdfPrintBackground: input.pdfPrintBackground,
    pdfScale: input.pdfScale,
    pdfMargin: asOptionalJson(input.pdfMargin, "PDF margin"),
    geo: input.geo,
    geoCity: input.geoCity,
    geoState: input.geoState,
    cacheTtl: input.cacheTtl,
  });
}

/** What the source — exactly one of url, html or markdown — is for each render action. */
export type SourceKind = "url" | "html" | "markdown";

export const DATA_PARAM: Param = {
  key: "data",
  label: "Template data",
  type: "json",
  hint: "JSON object. When set, the HTML/Markdown is rendered as a Mustache template " +
    "({{var}} escaped, {{{var}}} raw, {{#list}}…{{/list}} loops) against it. Max 256 KB.",
};

export const CAPTURE_OUTPUT = [
  { key: "image", type: "string", label: "Base64-encoded image or PDF" },
  { key: "contentType", type: "string", label: "MIME type of the output" },
  { key: "url", type: "string", label: "Captured URL" },
  { key: "width", type: "number", label: "Output width" },
  { key: "height", type: "number", label: "Output height" },
  { key: "format", type: "string", label: "Output format" },
  { key: "bytesSize", type: "number", label: "Size in bytes" },
  { key: "capturedAt", type: "string", label: "Capture timestamp" },
  { key: "quality", type: "string", label: "full, degraded or best_attempt" },
  { key: "loadTimeMs", type: "number", label: "Page load time in ms" },
  { key: "meta", type: "object", label: "Request id and credit usage" },
] as const;
