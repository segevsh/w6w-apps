import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  fileId: number;
  latestVersionOnly?: boolean;
}

/** `GET /rest/v1.0/files/{id}?project_id=` — file metadata and versions, not the bytes. */
const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Fetch a Documents file's metadata and versions (not its content).",
  params: [
    companyIdParam,
    projectIdParam,
    {
      key: "fileId",
      label: "File ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "latestVersionOnly", label: "Latest version only", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "File ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "size", type: "number", label: "Size in bytes" },
    { key: "name_with_path", type: "string", label: "Path" },
    { key: "file_versions", type: "array", label: "Versions" },
  ],

  async execute(input, ctx) {
    const reply = await new ProcoreClient(ctx).request(
      `/rest/v1.0/files/${encodeURIComponent(String(input.fileId))}`,
      {
        companyId: input.companyId,
        query: { project_id: input.projectId, show_latest_version_only: input.latestVersionOnly },
      },
    );
    return reply.data;
  },
};

export default fileGet;
