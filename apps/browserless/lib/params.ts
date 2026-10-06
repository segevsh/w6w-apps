import type { Param } from "@w6w/types";
import { compact } from "./client.ts";

/**
 * Parameters shared by the browser-backed REST routes (`/screenshot`, `/pdf`,
 * `/content`, `/scrape`, `/export`, `/unblock`). Names and shapes follow the
 * vendor's "Request Configuration" page and the per-route OpenAPI pages
 * (verified 2026-10-06).
 *
 * Every route also accepts options this app does not model one by one (cookies,
 * request interceptors, script/style tags, emulated media, …). They stay
 * reachable through `requestOverrides`, a JSON object merged over the body the
 * app builds, so nothing the vendor supports is out of reach.
 */

export const urlParam: Param = {
  key: "url",
  label: "URL",
  type: "string",
  hint: "The page to load. Give either a URL or raw HTML, never both.",
  placeholder: "https://example.com/",
};

export const htmlParam: Param = {
  key: "html",
  label: "HTML",
  type: "text",
  hint: "Render this HTML instead of navigating to a URL. Do not also set a URL — the vendor " +
    "rejects a request carrying both.",
};

export const waitUntilParam: Param = {
  key: "waitUntil",
  label: "Wait until",
  type: "select",
  hint:
    "When navigation counts as finished (`gotoOptions.waitUntil`). `networkidle2` suits pages " +
    "that keep a connection open.",
  options: [
    { value: "load", label: "load — every dependent resource loaded" },
    { value: "domcontentloaded", label: "domcontentloaded — HTML parsed" },
    { value: "networkidle0", label: "networkidle0 — no connections for 500 ms" },
    { value: "networkidle2", label: "networkidle2 — at most 2 connections for 500 ms" },
  ],
};

export const waitForSelectorParam: Param = {
  key: "waitForSelector",
  label: "Wait for selector",
  type: "string",
  hint: "A CSS selector to wait for before capturing. Fails with a non-200 if it never appears " +
    "(unless Best attempt is on).",
};

export const waitForTimeoutParam: Param = {
  key: "waitForTimeout",
  label: "Wait (ms)",
  type: "number",
  validation: { integer: true, min: 0 },
  hint: "Fixed delay in milliseconds before capturing, for animations and late renders.",
};

export const bestAttemptParam: Param = {
  key: "bestAttempt",
  label: "Best attempt",
  type: "boolean",
  hint: "Carry on with whatever page state exists when a navigation or wait times out, instead " +
    "of failing with a 408.",
};

export const rejectResourceTypesParam: Param = {
  key: "rejectResourceTypes",
  label: "Block resource types",
  type: "multiselect",
  hint: "Resource types the browser must not load — blocking images or fonts speeds a capture " +
    "and shortens the billed browser time.",
  options: ["image", "stylesheet", "font", "media", "script", "xhr", "fetch", "websocket", "other"]
    .map((v) => ({ value: v, label: v })),
};

export const userAgentParam: Param = {
  key: "userAgent",
  label: "User agent",
  type: "string",
  hint: "Override the browser's User-Agent string.",
};

export const extraHeadersParam: Param = {
  key: "extraHeaders",
  label: "Extra request headers",
  type: "json",
  hint:
    "A JSON object of headers the page sends with every request (`setExtraHTTPHeaders`), e.g. " +
    '{"x-trace": "abc"}.',
};

export const viewportWidthParam: Param = {
  key: "viewportWidth",
  label: "Viewport width (px)",
  type: "number",
  validation: { integer: true, min: 1 },
  hint: "Set together with the height; one without the other is refused.",
};

export const viewportHeightParam: Param = {
  key: "viewportHeight",
  label: "Viewport height (px)",
  type: "number",
  validation: { integer: true, min: 1 },
};

export const requestOverridesParam: Param = {
  key: "requestOverrides",
  label: "Request overrides (JSON)",
  type: "json",
  hint: "A JSON object merged over the request body this action builds — the way to reach " +
    "vendor options without a dedicated field (cookies, addStyleTag, emulateMediaType, " +
    "requestInterceptors, …). Keys here win over the fields above.",
};

// ---- query-string parameters (apply to every REST route) -------------------

export const timeoutParam: Param = {
  key: "timeout",
  label: "Request timeout (ms)",
  type: "number",
  validation: { integer: true, min: 1 },
  hint: "Overrides the plan's default request timeout (30 s). Browser time is billed in " +
    "30-second increments, so a long timeout on a stuck page is billed.",
};

export const proxyParam: Param = {
  key: "proxy",
  label: "Proxy",
  type: "select",
  hint: "Route the browser through Browserless's built-in proxy. Metered on top of browser " +
    "time: residential 6 units/MB, datacenter 2 units/MB.",
  options: [
    { value: "residential", label: "Residential (6 units/MB)" },
    { value: "datacenter", label: "Datacenter (2 units/MB)" },
  ],
};

export const proxyCountryParam: Param = {
  key: "proxyCountry",
  label: "Proxy country",
  type: "string",
  validation: { pattern: "^[A-Za-z]{2}$" },
  hint: "Two-letter country code for the proxy exit, e.g. `us`. Used with Proxy.",
};

export const proxyStickyParam: Param = {
  key: "proxySticky",
  label: "Sticky proxy IP",
  type: "boolean",
  hint: "Use the same exit IP for every request in the session.",
};

export const queryParams: Param[] = [timeoutParam, proxyParam, proxyCountryParam, proxyStickyParam];

export const requestParams: Param[] = [
  waitUntilParam,
  waitForSelectorParam,
  waitForTimeoutParam,
  bestAttemptParam,
  rejectResourceTypesParam,
  userAgentParam,
  extraHeadersParam,
  viewportWidthParam,
  viewportHeightParam,
];

export interface QueryInput {
  timeout?: number;
  proxy?: string;
  proxyCountry?: string;
  proxySticky?: boolean;
}

export function buildQuery(
  input: QueryInput,
): Record<string, string | number | boolean | undefined> {
  return compact({
    timeout: input.timeout,
    proxy: input.proxy,
    proxyCountry: input.proxyCountry?.trim().toLowerCase(),
    proxySticky: input.proxySticky ? true : undefined,
  });
}

export interface PageInput {
  url?: string;
  html?: string;
  waitUntil?: string;
  waitForSelector?: string;
  waitForTimeout?: number;
  bestAttempt?: boolean;
  rejectResourceTypes?: string[];
  userAgent?: string;
  extraHeaders?: Record<string, string> | string;
  viewportWidth?: number;
  viewportHeight?: number;
  requestOverrides?: Record<string, unknown> | string;
}

/** JSON params arrive as an object, or as text when typed by hand. */
export function asObject(value: unknown, label: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error(`${label} must be a JSON object`);
    }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return v as Record<string, unknown>;
}

/** Exactly one of `url` / `html`: the vendor refuses a request that carries both. */
export function assertUrlXorHtml(input: { url?: string; html?: string }): void {
  const hasUrl = !!input.url?.trim();
  const hasHtml = !!input.html?.trim();
  if (hasUrl && hasHtml) {
    throw new Error(
      "Give either a URL or HTML, not both — Browserless rejects a request with both",
    );
  }
  if (!hasUrl && !hasHtml) throw new Error("Give a URL or HTML to render");
}

/**
 * The body fields common to the browser routes. `url`/`html` are set by the
 * caller; everything here is optional and omitted when unset.
 */
export function buildPageBody(input: PageInput): Record<string, unknown> {
  const hasWidth = input.viewportWidth !== undefined && input.viewportWidth !== null;
  const hasHeight = input.viewportHeight !== undefined && input.viewportHeight !== null;
  if (hasWidth !== hasHeight) {
    throw new Error("Set both viewport width and viewport height, or neither");
  }

  const gotoOptions = input.waitUntil ? { waitUntil: input.waitUntil } : undefined;
  const waitForSelector = input.waitForSelector?.trim()
    ? { selector: input.waitForSelector.trim() }
    : undefined;
  const extraHeaders = asObject(input.extraHeaders, "Extra request headers");
  const rejectTypes = input.rejectResourceTypes?.length ? input.rejectResourceTypes : undefined;

  return compact({
    url: input.url?.trim(),
    html: input.html?.trim() ? input.html : undefined,
    gotoOptions,
    waitForSelector,
    waitForTimeout: input.waitForTimeout,
    bestAttempt: input.bestAttempt ? true : undefined,
    rejectResourceTypes: rejectTypes,
    userAgent: input.userAgent?.trim() ? { userAgent: input.userAgent.trim() } : undefined,
    setExtraHTTPHeaders: extraHeaders,
    viewport: hasWidth && hasHeight
      ? { width: input.viewportWidth, height: input.viewportHeight }
      : undefined,
  });
}

export function withOverrides(
  body: Record<string, unknown>,
  overrides: Record<string, unknown> | string | undefined,
): Record<string, unknown> {
  return { ...body, ...(asObject(overrides, "Request overrides") ?? {}) };
}
