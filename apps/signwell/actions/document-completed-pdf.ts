import type { ActionDefinition } from "@w6w/types";
import { requireId, SignWellClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /api/v1/documents/{id}/completed_pdf` — verified against SignWell's OpenAPI document
 * (`getCompletedPdf`). Without `url_only=true` the response is raw PDF/ZIP bytes, which this
 * sandbox cannot carry, so the action ALWAYS sends `url_only=true` and returns the documented
 * `{ file_url }`. `audit_page` (default true) and `file_format` (`pdf` | `zip`) are the other two
 * documented query parameters.
 */
const documentCompletedPdf: ActionDefinition = {
  key: "document-completed-pdf",
  type: "read",
  resource: "document",
  title: "Get a Completed Document Link",
  description: "Get a download URL for a completed document's final PDF (or zip).",
  params: [
    idParam("Document id", "A completed document."),
    {
      key: "audit_page",
      label: "Include audit page",
      type: "boolean",
      hint: "SignWell's default is on; cannot be turned off for a 21 CFR Part 11 document.",
    },
    {
      key: "file_format",
      label: "File format",
      type: "select",
      options: [{ value: "pdf", label: "PDF" }, { value: "zip", label: "Zip" }],
      hint: "Zip is unavailable on a 21 CFR Part 11 document.",
    },
  ],
  output: [{ key: "file_url", type: "string", label: "URL to download the completed document" }],

  async execute(input, ctx) {
    const i = input as { id?: unknown; audit_page?: unknown; file_format?: unknown };
    const id = requireId(i.id);
    ctx.log("info", "getting a SignWell completed document link", { id });
    return await new SignWellClient(ctx).request(
      `/documents/${encodeURIComponent(id)}/completed_pdf`,
      {
        query: {
          url_only: true,
          audit_page: i.audit_page as boolean | undefined,
          file_format: i.file_format as string | undefined,
        },
      },
    );
  },
};

export default documentCompletedPdf;
