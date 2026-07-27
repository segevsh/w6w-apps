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
}

/**
 * Creates a new file — `POST /repository/files/{path}`. GitLab rejects this if
 * the file already exists on `branch`; use `file-update` to change one. Content
 * defaults to `text`; pass `base64` (and a base64 string) for binary files.
 */
const fileCreate: ActionDefinition<Input> = {
  key: "file-create",
  type: "perform",
  resource: "file",
  title: "Create File",
  description: "Commit a new file to a branch. Fails if the file already exists.",
  // Replaying a successful create fails GitLab's "file already exists" check
  // rather than committing twice.
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
      hint: "File contents. For binary files set Encoding to base64 and pass base64 here.",
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
        method: "POST",
        body: {
          branch: input.branch,
          content: input.content,
          commit_message: input.commitMessage,
          encoding: unset(input.encoding),
        },
      },
    );
  },
};

export default fileCreate;
