import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/issues/{index}` — verified against Gitea's
 * Swagger document (`issueGetIssue`).
 *
 * The path takes the **issue number** — the one in the URL and the `#123`
 * reference — not the `id` field, which is an internal database key that is
 * unique across the whole instance and matches nothing a human has ever typed.
 * Both are in the response, which is how the confusion starts.
 */
const action: ActionDefinition = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get an issue",
  description: "Retrieve one issue by its number.",
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    {
      key: "issueNumber",
      label: "Issue Number",
      type: "number",
      required: true,
      hint: "The `#123` number, not the internal `id`.",
    },
  ],
  output: [
    { key: "number", type: "number", label: "Issue number" },
    { key: "id", type: "number", label: "Internal id — not what the API paths take" },
    { key: "title", type: "string", label: "Title" },
    { key: "body", type: "string", label: "Body" },
    { key: "state", type: "string", label: "open or closed" },
    { key: "labels", type: "array", label: "Labels" },
    { key: "assignees", type: "array", label: "Assignees" },
    { key: "milestone", type: "object", label: "Milestone" },
    { key: "comments", type: "number", label: "Comment count" },
    { key: "pull_request", type: "object", label: "Present when this issue IS a pull request" },
    { key: "html_url", type: "string", label: "Web URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const number = Number(p.issueNumber);
    if (!Number.isFinite(number)) throw new Error("`issueNumber` is required");

    ctx.log("info", "getting a Gitea issue", { owner, repo, number });

    return await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`,
    );
  },
};

export default action;
