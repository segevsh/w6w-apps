import type { ActionDefinition } from "@w6w/types";
import { compact, csv, GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `POST /repos/{owner}/{repo}/pulls` — verified against Gitea's Swagger
 * document (`repoCreatePullRequest`).
 *
 * **`head` and `base` are the pair to get right, and the spec marks neither
 * required.** `head` is the branch with the changes, `base` is where they are
 * going. Swapping them produces a real pull request in the opposite direction,
 * which merges main into a feature branch — not an error, just wrong.
 *
 * A cross-repository pull request writes `head` as `fork-owner:branch`. That
 * form is passed through unchanged, since a colon is meaningful here.
 */
const action: ActionDefinition = {
  key: "pull-request-create",
  type: "perform",
  resource: "pull-request",
  title: "Create a pull request",
  description: "Open a pull request from one branch into another.",
  // Gitea rejects a second PR for the same head/base rather than deduping.
  idempotent: false,
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    { key: "title", label: "Title", type: "string", required: true, default: "" },
    {
      key: "head",
      label: "Head Branch",
      type: "string",
      required: true,
      default: "",
      placeholder: "feature/thing",
      hint: "The branch WITH the changes. For a fork, `fork-owner:branch`.",
    },
    {
      key: "base",
      label: "Base Branch",
      type: "string",
      required: true,
      default: "",
      placeholder: "main",
      hint: "Where the changes are going. Swapping these two makes a real PR the wrong way round.",
    },
    { key: "body", label: "Body", type: "text", default: "" },
    {
      key: "assignees",
      label: "Assignees",
      type: "string",
      default: "",
      hint: "Comma-separated usernames.",
    },
    {
      key: "reviewers",
      label: "Reviewers",
      type: "string",
      default: "",
      hint: "Comma-separated usernames.",
    },
  ],
  output: [
    { key: "number", type: "number", label: "PR number — shared with the issue numbering" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "open or closed" },
    { key: "mergeable", type: "boolean", label: "Mergeable — null until Gitea has checked" },
    { key: "html_url", type: "string", label: "Web URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const title = String(p.title ?? "").trim();
    if (!title) throw new Error("`title` is required");
    const head = String(p.head ?? "").trim();
    const base = String(p.base ?? "").trim();
    if (!head) throw new Error("`head` is required — the branch with the changes");
    if (!base) throw new Error("`base` is required — the branch the changes are going into");
    if (head === base) {
      throw new Error("`head` and `base` are the same branch — there is nothing to merge");
    }

    const body = compact({
      title,
      head,
      base,
      body: p.body,
      assignees: csv(p.assignees),
      reviewers: csv(p.reviewers),
    });

    ctx.log("info", "creating a Gitea pull request", { owner, repo, head, base });

    return await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
      { method: "POST", body },
    );
  },
};

export default action;
