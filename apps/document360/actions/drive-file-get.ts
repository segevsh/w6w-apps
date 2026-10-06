import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import { folderIdParam, projectIdParam } from "../lib/params.ts";

/** Fetch a Drive file's metadata: URL, type, dimensions, tags and alternative text. The folder id must be the folder that currently holds the file. */
interface Input {
  projectId?: string;
  folderId: string;
  fileId: string;
}

const driveFileGet: ActionDefinition<Input> = {
  key: "drive-file-get",
  type: "read",
  resource: "drive",
  title: "Get Drive File",
  description:
    "Fetch a Drive file's metadata: URL, type, dimensions, tags and alternative text. The folder id must be the folder that currently holds the file.",
  params: [projectIdParam, folderIdParam, {
    key: "fileId",
    label: "File ID",
    type: "string",
    required: true,
  }],
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "file_name", type: "string", label: "File name" },
    { key: "file_type", type: "string", label: "File type" },
    { key: "file_url", type: "string", label: "File URL" },
  ],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data(
      "GET",
      c.projectPath(
        input.projectId,
        `/drive/folders/${encodeId(input.folderId)}/files/${encodeId(input.fileId)}`,
      ),
    );
  },
};

export default driveFileGet;
