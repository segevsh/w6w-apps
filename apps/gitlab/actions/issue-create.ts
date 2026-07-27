import type { ActionDefinition } from "@w6w/types";
import { csv, GitLabClient, projectPath, unset } from "../lib/client.ts";
import { issueOutput, projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  title: string;
  description?: string;
  labels?: string;
  assigneeIds?: string;
  dueDate?: string;
}

const issueCreate: ActionDefinition<Input> = {
  key: "issue-create",
  type: "perform",
  resource: "issue",
  title: "Create Issue",
  description: "Open an issue on a project.",
  // GitLab assigns a new issue IID per call and offers no request key, so a
  // retry files a duplicate.
  idempotent: false,
  params: [
    projectId,
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "description",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "Markdown.",
    },
    { key: "labels", label: "Labels", type: "string", hint: "Comma-separated label names." },
    {
      key: "assigneeIds",
      label: "Assignee IDs",
      type: "string",
      hint: "Comma-separated numeric user IDs.",
    },
    { key: "dueDate", label: "Due date", type: "string", hint: "ISO date, e.g. 2026-08-01." },
  ],
  output: issueOutput,

  execute(input, ctx) {
    return new GitLabClient(ctx).request(`/projects/${projectPath(input.projectId)}/issues`, {
      method: "POST",
      body: {
        title: input.title,
        description: unset(input.description),
        // GitLab wants labels as a comma-separated string, not an array.
        labels: csv(input.labels)?.join(","),
        assignee_ids: csv(input.assigneeIds)?.map(Number),
        due_date: unset(input.dueDate),
      },
    });
  },
};

export default issueCreate;
