import type { ActionDefinition } from "@w6w/types";
import {
  base64ToBytes,
  buildMultipart,
  FILE_OUTPUT,
  mapFile,
  MillionVerifierClient,
  splitList,
} from "../lib/client.ts";

interface Input {
  emails?: string;
  contentBase64?: string;
  filename?: string;
  contentType?: string;
}

/**
 * `POST /bulkapi/v2/upload` (multipart, field `file_contents`, on the bulk host). Either
 * pass `emails` and the app writes a one-address-per-line `.txt` (the vendor's own example
 * is `mails500.txt`), or pass your own file as base64. Answers the file record; an account
 * short of credits answers `{error: "insufficient_credits", unique_emails, credits}`, which
 * the client turns into an error.
 */
const bulkUpload: ActionDefinition<Input> = {
  key: "bulk-upload",
  type: "perform",
  idempotent: false,
  resource: "bulk-file",
  title: "Upload Bulk File",
  description: "Upload a list of emails (or your own file) for bulk verification. Returns the " +
    "file record; poll it with Get Bulk File until it is finished. Spends a credit per unique address.",
  params: [
    {
      key: "emails",
      label: "Emails",
      type: "text",
      hint: "One address per line (commas and spaces also separate). Ignored when a file is given.",
    },
    {
      key: "contentBase64",
      label: "File (base64)",
      type: "text",
      advanced: true,
      hint: "Your own file, base64 encoded, instead of the list above.",
    },
    { key: "filename", label: "Filename", type: "string", advanced: true, default: "emails.txt" },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      advanced: true,
      default: "text/plain",
    },
  ],
  output: FILE_OUTPUT,

  async execute(input, ctx) {
    let bytes: Uint8Array;
    let filename = String(input.filename ?? "").trim() || "emails.txt";
    let contentType = String(input.contentType ?? "").trim() || "text/plain";
    if (String(input.contentBase64 ?? "").trim()) {
      bytes = base64ToBytes(String(input.contentBase64));
    } else {
      const emails = splitList(input.emails);
      if (emails.length === 0) throw new Error("provide emails or a file (contentBase64)");
      bytes = new TextEncoder().encode(`${emails.join("\n")}\n`);
      filename = "emails.txt";
      contentType = "text/plain";
    }
    const { body, contentType: ct } = buildMultipart([{
      field: "file_contents",
      filename,
      contentType,
      bytes,
    }]);
    const res = await new MillionVerifierClient(ctx).request("/bulkapi/v2/upload", {
      api: "bulk",
      method: "POST",
      body,
      contentType: ct,
    });
    return mapFile(res.body);
  },
};

export default bulkUpload;
