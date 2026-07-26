import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { owner, pagination, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  perPage?: number;
  page?: number;
}

const workflowGetMany: ActionDefinition<Input> = {
  key: "workflow-get-many",
  type: "search",
  resource: "workflow",
  title: "List Workflows",
  description: "List the Actions workflows defined in a repository.",
  params: [owner, repository, ...pagination],
  output: [
    { key: "total_count", type: "number", label: "Total" },
    { key: "workflows", type: "array", label: "Workflows" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/actions/workflows`,
      { query: { per_page: input.perPage, page: input.page } },
    );
  },
};

export default workflowGetMany;
