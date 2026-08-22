import type { ActionDefinition } from "@w6w/types";
import { csv, GiteaClient, resolveRepo } from "../lib/client.ts";
import { LIST_PARAMS, OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/issues` — verified against Gitea's Swagger
 * document (`issueListIssues`).
 *
 * **This returns pull requests too.** Gitea, like the API it is compatible
 * with, models a pull request as an issue with a `pull_request` field, so an
 * unfiltered issue list is issues *and* PRs. The `type` filter is how you get
 * one or the other, and it is the difference between "we have 12 open issues"
 * and a number that quietly includes every open PR.
 */
const action: ActionDefinition = {
  key: "issue-list",
  type: "read",
  resource: "issue",
  title: "List issues",
  description: "List a repository's issues — and, unless filtered, its pull requests.",
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "issues",
      options: [
        { value: "issues", label: "Issues only" },
        { value: "pulls", label: "Pull requests only" },
        { value: "", label: "Both — Gitea's own default" },
      ],
      hint: "Unfiltered, Gitea returns pull requests alongside issues.",
    },
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
      default: "",
      hint: "Comma-separated label NAMES — unlike issue creation, which takes ids.",
    },
    { key: "q", label: "Search", type: "string", default: "", hint: "Matches title and body." },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    // The host applies `default`, but a bare execute() call does not.
    const type = p.type === undefined ? "issues" : String(p.type);

    ctx.log("info", "listing Gitea issues", { owner, repo, type, returnAll });

    return await new GiteaClient(ctx).requestAll(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      {
        query: {
          type: type || undefined,
          state: String(p.state ?? "open"),
          labels: csv(p.labels)?.join(","),
          q: (p.q as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
