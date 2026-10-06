import type { ActionDefinition } from "@w6w/types";
import { compact, PrintNodeClient } from "../lib/client.ts";
import { contentTypeOptions } from "../lib/params.ts";

/**
 * `POST /printjobs` — queue a document for printing.
 *
 * The vendor answers `201` with a BARE INTEGER (the new print job id), not an
 * object; this action wraps it as `{ printJobId }`.
 *
 * Not idempotent: PrintNode takes no idempotency key, so a retry prints twice.
 * `qty` is the vendor's own way to send one job to the queue several times; the
 * `copies` option instead relies on printer driver support. Printing options
 * have no effect on RAW content types.
 */
interface Input {
  printerId: number;
  contentType: string;
  content: string;
  title?: string;
  source?: string;
  expireAfter?: number;
  qty?: number;
  copies?: number;
  collate?: boolean;
  color?: boolean;
  duplex?: string;
  fitToPage?: boolean;
  paper?: string;
  bin?: string;
  media?: string;
  dpi?: string;
  nup?: number;
  pages?: string;
  rotate?: string | number;
  authType?: string;
  authUser?: string;
  authPass?: string;
}

const printjobCreate: ActionDefinition<Input> = {
  key: "printjob-create",
  type: "perform",
  resource: "printjob",
  title: "Create Print Job",
  description: "Send a PDF or raw document to a printer. Returns the new print job id.",
  idempotent: false,
  params: [
    {
      key: "printerId",
      label: "Printer ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "From List Printers.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "select",
      required: true,
      default: "pdf_uri",
      options: contentTypeOptions,
    },
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      hint: "A URL for the `_uri` types, or the base64-encoded document for the `_base64` types. " +
        "Request bodies over 50 MB are refused with 413; use a URL for large files.",
    },
    { key: "title", label: "Title", type: "string", hint: "Name shown in the OS print queue." },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "Free text describing where the job came from.",
    },
    {
      key: "expireAfter",
      label: "Expire after (seconds)",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "How long PrintNode keeps an undeliverable job. Vendor default is 14 days.",
    },
    {
      key: "qty",
      label: "Quantity",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Deliver the document to the queue this many times. The only way to get multiple " +
        "copies of RAW content.",
    },
    {
      key: "advanced",
      label: "Print options (PDF only)",
      title: "Print options (PDF only)",
      type: "section",
      section: "collapsible",
      children: [
        {
          key: "copies",
          label: "Copies",
          type: "number",
          validation: { integer: true, min: 1 },
          hint: "Needs printer driver support; see `qty`.",
        },
        { key: "collate", label: "Collate", type: "boolean" },
        {
          key: "color",
          label: "Colour",
          type: "boolean",
          hint: "Set false for grayscale. Only honoured on Windows with the Engine6 backend.",
        },
        {
          key: "duplex",
          label: "Duplex",
          type: "select",
          options: [
            { value: "one-sided", label: "One-sided" },
            { value: "long-edge", label: "Long edge" },
            { value: "short-edge", label: "Short edge" },
          ],
        },
        { key: "fitToPage", label: "Fit to page", type: "boolean" },
        {
          key: "paper",
          label: "Paper",
          type: "string",
          hint: "A key of the printer's `capabilities.papers`, e.g. `A4`.",
        },
        {
          key: "bin",
          label: "Bin / tray",
          type: "string",
          hint: "One of the printer's `capabilities.bins`.",
        },
        {
          key: "media",
          label: "Media",
          type: "string",
          hint: "One of the printer's `capabilities.medias`.",
        },
        {
          key: "dpi",
          label: "DPI",
          type: "string",
          hint: "One of the printer's `capabilities.dpis`, e.g. `600x600`.",
        },
        {
          key: "nup",
          label: "Pages per sheet (macOS)",
          type: "number",
          validation: { integer: true, min: 1 },
        },
        {
          key: "pages",
          label: "Pages",
          type: "string",
          hint: "Print-dialog syntax: `1,3`, `-5`, `1,3-`, `-` for all.",
        },
        {
          key: "rotate",
          label: "Rotate",
          type: "select",
          options: [
            { value: "0", label: "0 (portrait)" },
            { value: "90", label: "90 (landscape)" },
            { value: "180", label: "180 (inverted portrait)" },
            { value: "270", label: "270 (inverted landscape)" },
          ],
          hint: "Absolute, not relative to the document.",
        },
      ],
    },
    {
      key: "auth",
      label: "Download authentication (URL content only)",
      title: "Download authentication (URL content only)",
      type: "section",
      section: "collapsible",
      children: [
        {
          key: "authType",
          label: "Type",
          type: "select",
          options: [
            { value: "BasicAuth", label: "HTTP Basic" },
            { value: "DigestAuth", label: "HTTP Digest" },
          ],
        },
        { key: "authUser", label: "Username", type: "string" },
        { key: "authPass", label: "Password", type: "secret" },
      ],
    },
  ],
  output: [{ key: "printJobId", type: "number", label: "New print job id" }],

  async execute(input, ctx) {
    const options = compact({
      copies: input.copies,
      collate: input.collate,
      color: input.color,
      duplex: input.duplex,
      fit_to_page: input.fitToPage,
      paper: input.paper,
      bin: input.bin,
      media: input.media,
      dpi: input.dpi,
      nup: input.nup,
      pages: input.pages,
      rotate: input.rotate === undefined || input.rotate === "" ? undefined : Number(input.rotate),
    });

    const body: Record<string, unknown> = compact({
      printerId: input.printerId,
      contentType: input.contentType,
      content: input.content,
      title: input.title,
      source: input.source,
      expireAfter: input.expireAfter,
      qty: input.qty,
    });
    if (Object.keys(options).length > 0) body.options = options;

    if (input.authUser || input.authPass) {
      if (!input.authUser || !input.authPass) {
        throw new Error("Download authentication needs both a username and a password");
      }
      body.authentication = {
        type: input.authType || "BasicAuth",
        credentials: { user: input.authUser, pass: input.authPass },
      };
    }

    const id = await new PrintNodeClient(ctx).json<unknown>("/printjobs", {
      method: "POST",
      body,
    });
    if (typeof id !== "number") {
      throw new Error("PrintNode did not return a print job id");
    }
    ctx.log("info", "print job created", { printJobId: id });
    return { printJobId: id };
  },
};

export default printjobCreate;
