import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, pagination, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  state?: string;
  base?: string;
  head?: string;
  sort?: string;
  direction?: string;
  perPage?: number;
  page?: number;
}

const pullRequestGetMany: ActionDefinition<Input, unknown[]> = {
  key: "pull-request-get-many",
  type: "search",
  resource: "pullRequest",
  title: "List Pull Requests",
  description: "List a repository's pull requests.",
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
    { key: "base", label: "Base branch", type: "string", row: "branches" },
    {
      key: "head",
      label: "Head",
      type: "string",
      row: "branches",
      hint: "`user:branch` — the source of the PR.",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      default: "created",
      row: "sort",
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "popularity", label: "Popularity" },
        { value: "long-running", label: "Long running" },
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
  output: [{ key: "", type: "array", label: "Pull requests" }],

  execute(input, ctx) {
    return new GitHubClient(ctx).request<unknown[]>(
      `/repos/${repoPath(input.owner, input.repository)}/pulls`,
      {
        query: {
          state: unset(input.state),
          base: unset(input.base),
          head: unset(input.head),
          sort: unset(input.sort),
          direction: unset(input.direction),
          per_page: input.perPage,
          page: input.page,
        },
      },
    );
  },
};

export default pullRequestGetMany;
