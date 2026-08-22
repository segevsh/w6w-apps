import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}` — verified against Gitea's Swagger document
 * (`repoGet`).
 *
 * `default_branch` is the field most workflows are actually here for: nothing
 * else tells you whether to write to `main`, `master` or something the team
 * renamed, and every file and branch action defaults to it.
 */
const action: ActionDefinition = {
  key: "repo-get",
  type: "read",
  resource: "repository",
  title: "Get a repository",
  description: "Retrieve one repository, including its default branch.",
  params: [REPO_PARAM, OWNER_PARAM],
  output: [
    { key: "id", type: "number", label: "Repository id" },
    { key: "full_name", type: "string", label: "owner/name" },
    { key: "default_branch", type: "string", label: "Default branch — what writes target" },
    { key: "private", type: "boolean", label: "Private" },
    { key: "archived", type: "boolean", label: "Archived — writes are refused" },
    { key: "fork", type: "boolean", label: "Fork" },
    { key: "open_issues_count", type: "number", label: "Open issues" },
    { key: "open_pr_counter", type: "number", label: "Open pull requests" },
    { key: "permissions", type: "object", label: "What this token may do here" },
    { key: "html_url", type: "string", label: "Web URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);

    ctx.log("info", "getting a Gitea repository", { owner, repo });

    return await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    );
  },
};

export default action;
