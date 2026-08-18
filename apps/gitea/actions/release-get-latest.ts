import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/releases/latest` — verified against Gitea's
 * Swagger document (`repoGetLatestRelease`).
 *
 * The endpoint a "what version is live" workflow wants, and it is worth having
 * as its own action because it is *not* the first row of `release-list`:
 * Gitea's `latest` deliberately skips drafts and prereleases, while the list
 * includes them. Answers `404` when there is no published release at all —
 * which is the correct answer for a repository that has never shipped, and
 * reads as a missing repository if you are not expecting it.
 */
const action: ActionDefinition = {
  key: "release-get-latest",
  type: "read",
  resource: "release",
  title: "Get the latest release",
  description: "The newest published release, skipping drafts and prereleases.",
  params: [REPO_PARAM, OWNER_PARAM],
  output: [
    { key: "id", type: "number", label: "Release id" },
    { key: "tag_name", type: "string", label: "Tag" },
    { key: "name", type: "string", label: "Title" },
    { key: "body", type: "string", label: "Release notes" },
    { key: "published_at", type: "string", label: "Published" },
    { key: "html_url", type: "string", label: "Web URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);

    ctx.log("info", "getting the latest Gitea release", { owner, repo });

    return await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`,
    );
  },
};

export default action;
