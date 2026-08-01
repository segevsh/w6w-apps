import type { ActionDefinition } from "@w6w/types";
import { OneSimpleApiClient } from "../lib/client.ts";

interface Input {
  url?: string;
  html?: string;
  page?: string;
  background?: boolean;
  force?: boolean;
}

interface Output {
  url?: string;
  page_size?: string;
  elapsed?: number;
  [key: string]: unknown;
}

const PAGE_SIZES = [
  "Letter",
  "Legal",
  "Tabloid",
  "Ledger",
  "A0",
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
] as const;

/**
 * GET /api/pdf — render a webpage (or a raw HTML string) to PDF.
 *
 * Output fields (`url`, `page_size`) are inferred from the vendor's
 * documented CSV columns ("page size, url") — see `take-screenshot.ts` for
 * why that inference is grounded rather than guessed.
 */
const createPdf: ActionDefinition<Input, Output> = {
  key: "create-pdf",
  type: "perform",
  resource: "website",
  title: "Create PDF",
  description: "Convert a webpage, or an HTML string, into a PDF.",
  // The vendor reuses a previously generated PDF for the same URL/options by
  // default (see `force`), so a retried call is safe.
  idempotent: true,
  params: [
    {
      key: "url",
      label: "Webpage URL",
      type: "string",
      hint: "The page to convert. Provide this or HTML, not both.",
    },
    {
      key: "html",
      label: "HTML",
      type: "text",
      hint: "Raw HTML to render instead of fetching a URL.",
    },
    {
      key: "page",
      label: "Page size",
      type: "select",
      hint: "Defaults to the vendor's standard page size.",
      options: PAGE_SIZES.map((v) => ({ value: v, label: v })),
    },
    {
      key: "background",
      label: "Include background",
      type: "boolean",
      default: false,
      hint: "Include background images and colors (excluded by default).",
    },
    {
      key: "force",
      label: "Force refresh",
      type: "boolean",
      default: false,
      hint: "Regenerate the PDF instead of reusing a previously cached one.",
    },
  ],
  output: [
    { key: "url", type: "string", label: "PDF file URL" },
    { key: "page_size", type: "string", label: "Page size used" },
  ],

  execute(input, ctx) {
    if (!input.url && !input.html) throw new Error("create-pdf: provide either url or html");
    const client = new OneSimpleApiClient(ctx);
    return client.request<Output>("/pdf", {
      query: {
        url: input.url,
        html: input.html,
        page: input.page,
        background: input.background ? "yes" : undefined,
        force: input.force ? "yes" : undefined,
      },
    });
  },
};

export default createPdf;
