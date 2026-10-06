import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient, compact } from "../lib/client.ts";
import {
  assertUrlXorHtml,
  buildPageBody,
  buildQuery,
  htmlParam,
  type PageInput,
  type QueryInput,
  queryParams,
  requestOverridesParam,
  requestParams,
  urlParam,
  withOverrides,
} from "../lib/params.ts";

interface Input extends PageInput, QueryInput {
  format?: string;
  landscape?: boolean;
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  pageRanges?: string;
  scale?: number;
  preferCSSPageSize?: boolean;
  tagged?: boolean;
}

const FORMATS = ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "Letter", "Legal", "Tabloid", "Ledger"];

/**
 * `POST /pdf` answers with `application/pdf` bytes. Returned as base64.
 *
 * Two behaviours the vendor documents and a caller trips on: `/pdf` cannot make
 * one single long page (use the Function action for that), and a `pageRanges`
 * that starts past the last page is an HTTP 500 with a plain-text body rather than
 * a PDF — it surfaces here as a thrown error carrying that text.
 */
const pdf: ActionDefinition<Input> = {
  key: "pdf",
  type: "read",
  resource: "page",
  title: "Render PDF",
  description:
    "Render a URL or raw HTML to a PDF with Chrome's print engine (real, selectable text), " +
    "returned as base64.",
  params: [
    urlParam,
    htmlParam,
    {
      key: "format",
      label: "Paper format",
      type: "select",
      options: FORMATS.map((f) => ({ value: f, label: f })),
      hint: "Leave empty for the browser default (Letter).",
    },
    { key: "landscape", label: "Landscape", type: "boolean" },
    {
      key: "printBackground",
      label: "Print background graphics",
      type: "boolean",
      hint: "Off by default, so CSS backgrounds are dropped.",
    },
    {
      key: "displayHeaderFooter",
      label: "Header and footer",
      type: "boolean",
      hint: "Needs a header and/or footer template, and a margin large enough to show them.",
    },
    {
      key: "headerTemplate",
      label: "Header template (HTML)",
      type: "text",
      hint: "HTML with the classes `date`, `title`, `url`, `pageNumber`, `totalPages` injected.",
    },
    { key: "footerTemplate", label: "Footer template (HTML)", type: "text" },
    {
      key: "marginTop",
      label: "Margin top",
      type: "string",
      placeholder: "1cm",
      hint: "A number (pixels) or a string with a unit: px, in, cm, mm.",
    },
    { key: "marginRight", label: "Margin right", type: "string" },
    { key: "marginBottom", label: "Margin bottom", type: "string" },
    { key: "marginLeft", label: "Margin left", type: "string" },
    {
      key: "pageRanges",
      label: "Page ranges",
      type: "string",
      placeholder: "1-5, 8, 11-13",
      hint: "Honoured exactly. A range that starts past the last page is an HTTP 500.",
    },
    {
      key: "scale",
      label: "Scale",
      type: "number",
      validation: { min: 0.1, max: 2 },
      hint: "Rendering scale, 0.1 to 2.",
    },
    {
      key: "preferCSSPageSize",
      label: "Prefer CSS page size",
      type: "boolean",
      hint: "Let a CSS `@page` size beat the paper format.",
    },
    {
      key: "tagged",
      label: "Tagged (accessible) PDF",
      type: "boolean",
      hint: "Embed structure tags for screen readers and parsers.",
    },
    ...requestParams,
    ...queryParams,
    requestOverridesParam,
  ],
  output: [
    { key: "contentType", type: "string", label: "MIME type (application/pdf)" },
    { key: "sizeBytes", type: "number", label: "PDF size in bytes" },
    { key: "base64", type: "string", label: "PDF bytes, base64-encoded" },
  ],

  async execute(input, ctx) {
    assertUrlXorHtml(input);
    const margin = compact({
      top: input.marginTop?.trim(),
      right: input.marginRight?.trim(),
      bottom: input.marginBottom?.trim(),
      left: input.marginLeft?.trim(),
    });
    const options = compact({
      format: input.format,
      landscape: input.landscape ? true : undefined,
      printBackground: input.printBackground ? true : undefined,
      displayHeaderFooter: input.displayHeaderFooter ? true : undefined,
      headerTemplate: input.headerTemplate,
      footerTemplate: input.footerTemplate,
      margin: Object.keys(margin).length ? margin : undefined,
      pageRanges: input.pageRanges?.trim(),
      scale: input.scale,
      preferCSSPageSize: input.preferCSSPageSize ? true : undefined,
      tagged: input.tagged ? true : undefined,
    });
    const body = withOverrides({
      ...buildPageBody(input),
      options: Object.keys(options).length ? options : undefined,
    }, input.requestOverrides);
    const bin = await new BrowserlessClient(ctx).binary("/pdf", {
      method: "POST",
      query: buildQuery(input),
      body: compact(body),
    });
    return { contentType: bin.contentType, sizeBytes: bin.sizeBytes, base64: bin.base64 };
  },
};

export default pdf;
