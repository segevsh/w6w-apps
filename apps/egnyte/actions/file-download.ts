import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient, encodePath, toBase64, unset } from "../lib/client.ts";
import { pathParam } from "../lib/params.ts";

interface Input {
  path: string;
  entryId?: string;
}

const fileDownload: ActionDefinition<Input> = {
  key: "file-download",
  type: "read",
  resource: "file",
  title: "Download File",
  description:
    "Download a file's content, returned base64-encoded (and as text when it decodes as UTF-8). Intended for small and medium files — the whole body is held in memory.",
  params: [
    pathParam("Full path of the file."),
    {
      key: "entryId",
      label: "Version entry ID",
      type: "string",
      advanced: true,
      hint: "entry_id of a specific version; leave blank for the latest.",
    },
  ],
  output: [
    { key: "contentBase64", type: "string", label: "Content (base64)" },
    { key: "text", type: "string", label: "Content (text)" },
    { key: "size", type: "number", label: "Size in bytes" },
    { key: "contentType", type: "string", label: "Content type" },
    { key: "checksum", type: "string", label: "SHA-512 checksum" },
  ],

  async execute(input, ctx) {
    const { bytes, headers } = await new EgnyteClient(ctx).download(
      `/v1/fs-content/${encodePath(input.path)}`,
      { entry_id: unset(input.entryId) },
    );
    let text: string | undefined;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      text = undefined;
    }
    return {
      contentBase64: toBase64(bytes),
      text,
      size: bytes.length,
      contentType: headers.get("content-type") ?? undefined,
      checksum: headers.get("x-sha512-checksum") ?? undefined,
    };
  },
};

export default fileDownload;
