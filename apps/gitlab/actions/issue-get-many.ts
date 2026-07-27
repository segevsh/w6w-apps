import type { ActionDefinition } from "@w6w/types";
import { csv, GitLabClient, projectPath, unset } from "../lib/client.ts";
import { issueOutput, pagination, projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  state?: string;
  labels?: string;
  search?: string;
  perPage?: number;
  page?: number;
}

const issueGetMany: ActionDefinition<Input> = {
  key: "issue-get-many",
  type: "read",
  resource: "issue",
  title: "Get Many Issues",
  description: "List a project's issues, optionally filtered by state, labels, or a search term.",
  params: [
    projectId,
    {
      key: "state",
      label: "State",
      type: "string",
      options: [
        { value: "opened", label: "Opened" },
        { value: "closed", label: "Closed" },
      ],
      hint: "Leave blank for all states.",
    },
    { key: "labels", label: "Labels", type: "string", hint: "Comma-separated label names." },
    { key: "search", label: "Search", type: "string", hint: "Search title and description." },
    ...pagination,
  ],
  output: issueOutput,

  execute(input, ctx) {
    return new GitLabClient(ctx).request(`/projects/${projectPath(input.projectId)}/issues`, {
      query: {
        state: unset(input.state),
        labels: csv(input.labels)?.join(","),
        search: unset(input.search),
        per_page: input.perPage,
        page: input.page,
      },
    });
  },
};

export default issueGetMany;
