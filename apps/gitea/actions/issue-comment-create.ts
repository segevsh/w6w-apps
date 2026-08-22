import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `POST /repos/{owner}/{repo}/issues/{index}/comments` — verified against
 * Gitea's Swagger document (`issueCreateComment`).
 *
 * **Pull requests take comments here too.** A PR is an issue in Gitea's model,
 * so its conversation comments live on this endpoint under the same number —
 * which is what a workflow posting a build result to a PR uses. The separate
 * review-comment endpoints are for line-anchored review notes, which this app
 * does not cover.
 */
const action: ActionDefinition = {
  key: "issue-comment-create",
  type: "perform",
  resource: "issue",
  title: "Comment on an issue or pull request",
  description: "Post a comment. Works on pull requests too — they are issues in Gitea's model.",
  // Two calls post two comments.
  idempotent: false,
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    {
      key: "issueNumber",
      label: "Issue or PR Number",
      type: "number",
      required: true,
      hint: "Pull requests share the issue numbering.",
    },
    { key: "body", label: "Comment", type: "text", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "Comment id" },
    { key: "body", type: "string", label: "Body" },
    { key: "html_url", type: "string", label: "Web URL" },
    { key: "created_at", type: "string", label: "Created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const number = Number(p.issueNumber);
    if (!Number.isFinite(number)) throw new Error("`issueNumber` is required");
    const body = String(p.body ?? "").trim();
    if (!body) throw new Error("`body` is required");

    ctx.log("info", "commenting on a Gitea issue", { owner, repo, number });

    return await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}/comments`,
      { method: "POST", body: { body } },
    );
  },
};

export default action;
