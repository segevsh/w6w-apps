import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient, encodePath, fromBase64, unset } from "../lib/client.ts";
import { pathParam } from "../lib/params.ts";

interface Input {
  path: string;
  content: string;
  encoding?: "text" | "base64";
  lastModified?: string;
}

const fileUpload: ActionDefinition<Input> = {
  key: "file-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description:
    "Create or overwrite a file at the given path from text or base64 content. Uses the single-request upload, which Egnyte documents for files up to 100 MB; larger files need the chunked flow, which this action does not cover.",
  // Re-uploading the same bytes to the same path just writes another version.
  idempotent: false,
  params: [
    pathParam("Full path of the file, including its name."),
    { key: "content", label: "Content", type: "text", required: true },
    {
      key: "encoding",
      label: "Content encoding",
      type: "select",
      default: "text",
      options: [
        { value: "text", label: "Plain text (UTF-8)" },
        { value: "base64", label: "Base64 (binary)" },
      ],
    },
    {
      key: "lastModified",
      label: "Last modified",
      type: "string",
      advanced: true,
      hint: "HTTP date, e.g. Sun, 26 Aug 2012 03:55:29 GMT. Defaults to now.",
    },
  ],
  output: [
    { key: "path", type: "string", label: "Path" },
    { key: "group_id", type: "string", label: "File ID" },
    { key: "entry_id", type: "string", label: "Version ID" },
    { key: "checksum", type: "string", label: "SHA-512 checksum" },
  ],

  async execute(input, ctx) {
    const bytes = input.encoding === "base64"
      ? fromBase64(input.content)
      : new TextEncoder().encode(input.content);
    const headers: Record<string, string> = {};
    const lm = unset(input.lastModified);
    if (lm) headers["last-modified"] = lm;
    const res = await new EgnyteClient(ctx).upload(
      `/v1/fs-content/${encodePath(input.path)}`,
      bytes,
      headers,
    );
    // Egnyte documents the response only as "file metadata"; pass it through.
    const body = (typeof res.body === "object" && res.body ? res.body : {}) as Record<
      string,
      unknown
    >;
    return { path: input.path.startsWith("/") ? input.path : `/${input.path}`, ...body };
  },
};

export default fileUpload;
