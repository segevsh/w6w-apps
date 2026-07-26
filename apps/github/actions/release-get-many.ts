import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { owner, pagination, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  perPage?: number;
  page?: number;
}

const releaseGetMany: ActionDefinition<Input, unknown[]> = {
  key: "release-get-many",
  type: "search",
  resource: "release",
  title: "List Releases",
  description: "List a repository's releases, newest first.",
  params: [owner, repository, ...pagination],
  output: [{ key: "", type: "array", label: "Releases" }],

  execute(input, ctx) {
    return new GitHubClient(ctx).request<unknown[]>(
      `/repos/${repoPath(input.owner, input.repository)}/releases`,
      { query: { per_page: input.perPage, page: input.page } },
    );
  },
};

export default releaseGetMany;
