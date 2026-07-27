import type { ActionDefinition } from "@w6w/types";
import { csv, GitLabClient, projectPath, unset } from "../lib/client.ts";
import { issueOutput, projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  issueIid: number;
  title?: string;
  description?: string;
  labels?: string;
  stateEvent?: string;
}

/**
 * Edits an issue via `PUT /issues/{iid}`. Only supplied fields are sent — the
 * client drops unset keys, so a partial edit never blanks the other fields.
 * `stateEvent` (`close`/`reopen`) is GitLab's verb for flipping state.
 */
const issueEdit: ActionDefinition<Input> = {
  key: "issue-edit",
  type: "perform",
  resource: "issue",
  title: "Edit Issue",
  description: "Update an issue's title, description, labels, or state.",
  idempotent: true,
  params: [
    projectId,
    { key: "issueIid", label: "Issue IID", type: "number", required: true },
    { key: "title", label: "Title", type: "string" },
    {
      key: "description",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "Markdown. Replaces the existing description.",
    },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      hint: "Comma-separated. Replaces the full label set.",
    },
    {
      key: "stateEvent",
      label: "State change",
      type: "string",
      options: [
        { value: "close", label: "Close" },
        { value: "reopen", label: "Reopen" },
      ],
      hint: "Leave blank to keep the current state.",
    },
  ],
  output: issueOutput,

  execute(input, ctx) {
    return new GitLabClient(ctx).request(
      `/projects/${projectPath(input.projectId)}/issues/${input.issueIid}`,
      {
        method: "PUT",
        body: {
          title: unset(input.title),
          description: unset(input.description),
          labels: csv(input.labels)?.join(","),
          state_event: unset(input.stateEvent),
        },
      },
    );
  },
};

export default issueEdit;
