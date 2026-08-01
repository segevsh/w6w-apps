import type { ActionDefinition } from "@w6w/types";
import { OneSimpleApiClient } from "../lib/client.ts";

interface Input {
  url: string;
  headers?: boolean;
}

interface Output {
  general?: { title?: string; description?: string; canonical?: string };
  twitter?: {
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  og?: { title?: string; url?: string; image?: string; description?: string; type?: string };
  headers?: Record<string, string[]>;
  elapsed?: number;
  [key: string]: unknown;
}

/**
 * GET /api/page_info — a page's title/description/canonical, Twitter Card,
 * and Open Graph tags in one call. Response shape confirmed against the
 * vendor's own documented example (docs.onesimpleapi.com "Web Page
 * Information", checked 2026-08-01).
 */
const getPageInfo: ActionDefinition<Input, Output> = {
  key: "get-page-info",
  type: "read",
  resource: "website",
  title: "Get Page Info",
  description: "Retrieve a webpage's title, meta tags, Twitter Card, and Open Graph data.",
  params: [
    {
      key: "url",
      label: "Webpage URL",
      type: "string",
      required: true,
      hint: "The page to analyze.",
    },
    {
      key: "headers",
      label: "Include response headers",
      type: "boolean",
      default: false,
      hint: "Also return the page's raw HTTP response headers.",
    },
  ],
  output: [
    { key: "general", type: "object", label: "Title, description, canonical URL" },
    { key: "twitter", type: "object", label: "Twitter Card tags" },
    { key: "og", type: "object", label: "Open Graph tags" },
  ],

  execute(input, ctx) {
    const client = new OneSimpleApiClient(ctx);
    return client.request<Output>("/page_info", {
      query: { url: input.url, headers: input.headers ? "yes" : undefined },
    });
  },
};

export default getPageInfo;
