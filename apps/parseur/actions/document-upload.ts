import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, encodeId, ParseurClient } from "../lib/client.ts";
import { mailboxIdParam } from "../lib/params.ts";

/**
 * `POST /parser/{id}/upload` — upload a binary document (PDF, image, EML, ...)
 * to a mailbox.
 *
 * ## Asynchronous, and the returned id is NOT the document's `id`
 *
 * A `201` here only means Parseur received the file — processing happens
 * afterward (`document-list` / `document-get` is how the result shows up).
 * The response's `attachments[].DocumentID` is an opaque correlation string
 * (e.g. `"1e2e34cba5c678a9012f3e456c789a0f"`), **not** the numeric `id` every
 * other document action uses — see `lib/client.ts`.
 *
 * ## Custom parameters
 *
 * Query-string parameters on the upload request are merged into the parsed
 * result once processing finishes (e.g. `?user.name=John` adds
 * `"user.name": "John"` to the result). Repeat a key to build an array. Keys
 * are lowercased by HTTP parsing; values keep their case.
 */
interface Input {
  mailboxId: string;
  file: unknown;
  customParams?: unknown;
}

interface UploadResponse {
  message?: string;
  attachments?: Array<{ name?: string; DocumentID?: string }>;
}

const documentUpload: ActionDefinition<Input> = {
  key: "document-upload",
  type: "perform",
  resource: "document",
  title: "Upload Document",
  description:
    "Upload a binary file (PDF, image, EML, ...) to a mailbox for parsing. Processing happens " +
    "asynchronously after this call returns.",
  idempotent: false,
  params: [
    mailboxIdParam,
    {
      key: "file",
      label: "File",
      type: "file",
      required: true,
      hint: "See Parseur's Help Center for the full list of supported document formats.",
    },
    {
      key: "customParams",
      label: "Custom parameters",
      type: "json",
      hint: "Object merged into the parsed result once processing finishes, e.g. " +
        '{"user.name": "John"}. Use a JSON array of values to build an array field.',
    },
  ],
  output: [
    { key: "message", type: "string", label: 'Vendor acknowledgement ("OK")' },
    { key: "attachments", type: "array", label: "Uploaded files and their DocumentID" },
  ],

  async execute(input, ctx) {
    const form = new FormData();
    // `input.file` arrives as whatever the host's `file` param resolves to
    // (a Blob/File in the reference runtime); FormData accepts it directly.
    form.append("file", input.file as Blob);

    const custom = asOptionalJson<Record<string, unknown>>(input.customParams, "Custom parameters");
    const query: Record<string, string | string[]> = {};
    if (custom) {
      for (const [key, value] of Object.entries(custom)) {
        if (value === undefined || value === null) continue;
        query[key] = Array.isArray(value) ? value.map(String) : String(value);
      }
    }

    return await new ParseurClient(ctx).request<UploadResponse>(
      `/parser/${encodeId(input.mailboxId)}/upload`,
      { method: "POST", form, query },
    );
  },
};

export default documentUpload;
