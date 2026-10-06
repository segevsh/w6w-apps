import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  excludeFiles?: boolean;
  excludeFolders?: boolean;
  latestVersionOnly?: boolean;
}

/**
 * `GET /rest/v1.0/folders?project_id=` — the project's root folder with its
 * child folders and files. Not a paginated collection.
 */
const folderList: ActionDefinition<Input> = {
  key: "folder-list",
  type: "read",
  resource: "folder",
  title: "List Project Root Folders and Files",
  description: "Return the Documents tool's root folder for a project with its children.",
  params: [
    companyIdParam,
    projectIdParam,
    { key: "excludeFiles", label: "Exclude files", type: "boolean" },
    { key: "excludeFolders", label: "Exclude child folders", type: "boolean" },
    { key: "latestVersionOnly", label: "Latest file version only", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Folder ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "folders", type: "array", label: "Child folders" },
    { key: "files", type: "array", label: "Child files" },
  ],

  async execute(input, ctx) {
    const reply = await new ProcoreClient(ctx).request("/rest/v1.0/folders", {
      companyId: input.companyId,
      query: {
        project_id: input.projectId,
        exclude_files: input.excludeFiles,
        exclude_folders: input.excludeFolders,
        show_latest_file_version_only: input.latestVersionOnly,
      },
    });
    return reply.data;
  },
};

export default folderList;
