import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  releaseId: number;
}

/**
 * Deletes the release, not the git tag it points at — the tag stays and can be
 * re-released.
 */
const releaseDelete: ActionDefinition<Input> = {
  key: "release-delete",
  type: "perform",
  resource: "release",
  title: "Delete Release",
  description: "Delete a release. The underlying git tag is left in place.",
  idempotent: true,
  params: [
    owner,
    repository,
    { key: "releaseId", label: "Release ID", type: "number", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/releases/${input.releaseId}`,
      { method: "DELETE" },
    );
  },
};

export default releaseDelete;
