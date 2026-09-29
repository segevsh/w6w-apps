import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";

interface Input {
  url: string;
}

/**
 * `POST /files` — turn a Paperform-hosted file URL (e.g. from a `file`/`image`/`signature`
 * field in a submission's `data`) into a signed URL and a direct access URL.
 *
 * `POST` on the wire, but no side effect — it reads back URLs for an existing file rather
 * than creating or modifying anything, so this is a `read` action despite the HTTP verb.
 */
const getFileUrls: ActionDefinition<Input> = {
  key: "get-file-urls",
  type: "read",
  resource: "file",
  title: "Get File URLs",
  description: "Get a signed URL and a direct access URL for a Paperform-hosted file (from a " +
    "submission's file/image/signature answer).",
  params: [
    {
      key: "url",
      label: "File URL",
      type: "string",
      required: true,
      hint: "The file's URL as it appears in a submission's data (a file/image/signature " +
        "answer).",
    },
  ],
  output: [
    { key: "fileUrl", type: "string", label: "Signed URL for the file" },
    { key: "storageUrl", type: "string", label: "Direct access URL for the file" },
  ],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<
      { file_url?: string; storage_url?: string }
    >("/files", { method: "POST", body: { url: input.url } });
    return { fileUrl: results?.file_url, storageUrl: results?.storage_url };
  },
};

export default getFileUrls;
