import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  folderId: number;
  excludeFiles?: boolean;
  excludeFolders?: boolean;
  latestVersionOnly?: boolean;
}

/** `GET /rest/v1.0/folders/{id}?project_id=` */
const folderGet: ActionDefinition<Input> = {
  key: "folder-get",
  type: "read",
  resource: "folder",
  title: "Get Folder",
  description: "Fetch one Documents folder with its child folders and files.",
  params: [
    companyIdParam,
    projectIdParam,
    {
      key: "folderId",
      label: "Folder ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "excludeFiles", label: "Exclude files", type: "boolean" },
    { key: "excludeFolders", label: "Exclude child folders", type: "boolean" },
    { key: "latestVersionOnly", label: "Latest file version only", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Folder ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "parent_id", type: "number", label: "Parent folder ID" },
    { key: "name_with_path", type: "string", label: "Path" },
    { key: "folders", type: "array", label: "Child folders" },
    { key: "files", type: "array", label: "Child files" },
  ],

  async execute(input, ctx) {
    const reply = await new ProcoreClient(ctx).request(
      `/rest/v1.0/folders/${encodeURIComponent(String(input.folderId))}`,
      {
        companyId: input.companyId,
        query: {
          project_id: input.projectId,
          exclude_files: input.excludeFiles,
          exclude_folders: input.excludeFolders,
          show_latest_file_version_only: input.latestVersionOnly,
        },
      },
    );
    return reply.data;
  },
};

export default folderGet;
