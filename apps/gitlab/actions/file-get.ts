import type { ActionDefinition } from "@w6w/types";
import { filePathSegment, GitLabClient, projectPath } from "../lib/client.ts";
import { projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  filePath: string;
  ref: string;
}

/**
 * Returns GitLab's file envelope, with `content` base64-encoded. Decoding is
 * left to the caller — the raw bytes may not be text. `ref` is required by the
 * endpoint (branch, tag, or commit SHA).
 */
const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Read a repository file's contents and blob SHA. Content comes back base64-encoded.",
  params: [
    projectId,
    {
      key: "filePath",
      label: "File path",
      type: "string",
      required: true,
      hint: "Path within the repository, e.g. `src/index.ts`.",
    },
    {
      key: "ref",
      label: "Ref",
      type: "string",
      required: true,
      default: "main",
      hint: "Branch, tag, or commit SHA.",
    },
  ],
  output: [
    { key: "file_path", type: "string", label: "Path" },
    { key: "blob_id", type: "string", label: "Blob SHA" },
    { key: "size", type: "number", label: "Size (bytes)" },
    { key: "content", type: "string", label: "Base64 content" },
    { key: "encoding", type: "string", label: "Encoding" },
    { key: "last_commit_id", type: "string", label: "Last commit SHA" },
  ],

  execute(input, ctx) {
    return new GitLabClient(ctx).request(
      `/projects/${projectPath(input.projectId)}/repository/files/${
        filePathSegment(input.filePath)
      }`,
      { query: { ref: input.ref } },
    );
  },
};

export default fileGet;
