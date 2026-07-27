import type { ActionDefinition } from "@w6w/types";
import { filePathSegment, GitLabClient, projectPath, unset } from "../lib/client.ts";
import { projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  filePath: string;
  branch: string;
  content: string;
  commitMessage: string;
  encoding?: string;
  lastCommitId?: string;
}

/**
 * Updates an existing file — `PUT /repository/files/{path}`. GitLab rejects
 * this if the file does not exist on `branch`; use `file-create` for a new one.
 * Pass `lastCommitId` (from `file-get`) as an optimistic-concurrency guard —
 * GitLab rejects the write if the file moved on since.
 */
const fileUpdate: ActionDefinition<Input> = {
  key: "file-update",
  type: "perform",
  resource: "file",
  title: "Update File",
  description: "Commit changes to an existing file on a branch.",
  idempotent: true,
  params: [
    projectId,
    { key: "filePath", label: "File path", type: "string", required: true },
    { key: "branch", label: "Branch", type: "string", required: true },
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "New file contents. For binary files set Encoding to base64 and pass base64 here.",
    },
    { key: "commitMessage", label: "Commit message", type: "string", required: true },
    {
      key: "encoding",
      label: "Encoding",
      type: "string",
      options: [
        { value: "text", label: "text" },
        { value: "base64", label: "base64" },
      ],
      hint: "Defaults to text.",
    },
    {
      key: "lastCommitId",
      label: "Last commit SHA",
      type: "string",
      hint: "Optional concurrency guard — the `last_commit_id` from Get File.",
    },
  ],
  output: [
    { key: "file_path", type: "string", label: "Path" },
    { key: "branch", type: "string", label: "Branch" },
  ],

  execute(input, ctx) {
    return new GitLabClient(ctx).request(
      `/projects/${projectPath(input.projectId)}/repository/files/${
        filePathSegment(input.filePath)
      }`,
      {
        method: "PUT",
        body: {
          branch: input.branch,
          content: input.content,
          commit_message: input.commitMessage,
          encoding: unset(input.encoding),
          last_commit_id: unset(input.lastCommitId),
        },
      },
    );
  },
};

export default fileUpdate;
