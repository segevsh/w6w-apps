import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, pagination, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  state?: string;
  labels?: string;
  assignee?: string;
  since?: string;
  sort?: string;
  direction?: string;
  perPage?: number;
  page?: number;
}

/**
 * GitHub's issues endpoint returns pull requests too — every PR is an issue.
 * Filter on the presence of `pull_request` downstream if you only want issues.
 */
const repositoryGetIssues: ActionDefinition<Input, unknown[]> = {
  key: "repository-get-issues",
  type: "search",
  resource: "repository",
  title: "List Repository Issues",
  description:
    "List a repository's issues. GitHub includes pull requests here — they carry a `pull_request` field.",
  params: [
    owner,
    repository,
    {
      key: "state",
      label: "State",
      type: "select",
      default: "open",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "all", label: "All" },
      ],
    },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      hint: "Comma-separated; issues must have ALL of them.",
    },
    { key: "assignee", label: "Assignee", type: "string", hint: "Login, `none`, or `*` for any." },
    { key: "since", label: "Updated since", type: "datetime", hint: "ISO 8601 timestamp." },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      default: "created",
      row: "sort",
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "comments", label: "Comments" },
      ],
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      default: "desc",
      row: "sort",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "", type: "array", label: "Issues" }],

  execute(input, ctx) {
    return new GitHubClient(ctx).request<unknown[]>(
      `/repos/${repoPath(input.owner, input.repository)}/issues`,
      {
        query: {
          state: unset(input.state),
          labels: unset(input.labels),
          assignee: unset(input.assignee),
          since: unset(input.since),
          sort: unset(input.sort),
          direction: unset(input.direction),
          per_page: input.perPage,
          page: input.page,
        },
      },
    );
  },
};

export default repositoryGetIssues;
