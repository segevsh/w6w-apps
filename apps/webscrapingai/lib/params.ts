import type { Param } from "@w6w/types";
import { compact, type QueryValue, requireText, toMap } from "./client.ts";

/** Fields every page-fetching endpoint (`/html`, `/text`, `/selected*`, `/ai/*`) accepts. */
export interface PageInput {
  url: string;
  headers?: Record<string, string> | string;
  timeout?: number;
  js?: boolean;
  jsTimeout?: number;
  waitFor?: string;
  proxy?: string;
  country?: string;
  customProxy?: string;
  device?: string;
  errorOn404?: boolean;
  errorOnRedirect?: boolean;
}

export const urlParam: Param = {
  key: "url",
  label: "Page URL",
  type: "string",
  required: true,
  placeholder: "https://example.com",
};

/** The shared fetch-tuning params, collapsed under one section. */
export const pageParams: Param[] = [
  urlParam,
  {
    key: "fetchOptions",
    label: "Fetch options",
    title: "Fetch options",
    type: "section",
    section: "collapsible",
    children: [
      {
        key: "js",
        label: "Render JavaScript",
        type: "boolean",
        default: true,
        hint: "Run the page in a headless Chromium (vendor default true).",
      },
      {
        key: "jsTimeout",
        label: "JS render timeout (ms)",
        type: "number",
        validation: { integer: true, min: 1, max: 20000 },
        hint: "Maximum JavaScript rendering time (vendor default 2000, max 20000).",
      },
      {
        key: "waitFor",
        label: "Wait for selector",
        type: "string",
        placeholder: "#content",
        hint: "CSS selector to wait for before returning. Overrides the JS render timeout.",
      },
      {
        key: "timeout",
        label: "Timeout (ms)",
        type: "number",
        validation: { integer: true, min: 1, max: 25000 },
        hint: "Maximum page retrieval time (vendor default 10000, capped at 25000).",
      },
      {
        key: "proxy",
        label: "Proxy type",
        type: "select",
        options: [
          { value: "datacenter", label: "Datacenter (default)" },
          { value: "residential", label: "Residential" },
          { value: "stealth", label: "Stealth" },
          { value: "auto", label: "Auto (cheapest tier that works)" },
        ],
        hint: "Residential and stealth cost more credits than datacenter.",
      },
      {
        key: "country",
        label: "Proxy country",
        type: "select",
        options: ["us", "gb", "de", "it", "fr", "ca", "es", "ru", "jp", "kr", "in", "hk", "tr"]
          .map((c) => ({ value: c, label: c.toUpperCase() })),
        hint: "Vendor default US.",
      },
      {
        key: "customProxy",
        label: "Custom proxy URL",
        type: "string",
        secret: true,
        placeholder: "http://user:password@host:port",
        hint: "Your own proxy instead of the built-in pool. Cannot be combined with Auto proxy.",
      },
      {
        key: "device",
        label: "Device",
        type: "select",
        options: [
          { value: "desktop", label: "Desktop (default)" },
          { value: "mobile", label: "Mobile" },
          { value: "tablet", label: "Tablet" },
        ],
      },
      {
        key: "headers",
        label: "Headers for the target page",
        type: "json",
        hint:
          'A JSON object, e.g. {"Cookie": "session=abc"}. Sent to the target page, not to the API.',
      },
      {
        key: "errorOn404",
        label: "Fail on target 404",
        type: "boolean",
        default: false,
      },
      {
        key: "errorOnRedirect",
        label: "Fail on target redirect",
        type: "boolean",
        default: false,
      },
    ],
  },
];

const PROXIES = ["datacenter", "residential", "stealth", "auto"];

/** Query for the shared fields. Only what the caller set reaches the wire. */
export function pageQuery(input: PageInput): Record<string, QueryValue> {
  const proxy = input.proxy?.trim() || undefined;
  if (proxy && !PROXIES.includes(proxy)) {
    throw new Error(`Proxy type must be one of ${PROXIES.join(", ")}`);
  }
  const customProxy = input.customProxy?.trim() || undefined;
  if (proxy === "auto" && customProxy) {
    throw new Error("Auto proxy cannot be combined with a custom proxy");
  }
  return compact({
    url: requireText(input.url, "Page URL"),
    headers: toMap(input.headers, "Headers"),
    timeout: input.timeout,
    js: input.js,
    js_timeout: input.jsTimeout,
    wait_for: input.waitFor?.trim(),
    proxy,
    country: input.country?.trim().toLowerCase(),
    custom_proxy: customProxy,
    device: input.device?.trim(),
    error_on_404: input.errorOn404 || undefined,
    error_on_redirect: input.errorOnRedirect || undefined,
  }) as Record<string, QueryValue>;
}
