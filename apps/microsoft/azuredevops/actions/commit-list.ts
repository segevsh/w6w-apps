import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, query } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/git/repositories/{id}/commits` — the history.
 *
 * The filters are prefixed the same way pull request search is —
 * `searchCriteria.itemVersion.version` for a branch, `searchCriteria.author`
 * for a person — and an unrecognised one is ignored rather than rejected, so a
 * mistyped filter quietly returns the default branch's whole history. This
 * action takes plain names and does the prefixing.
 *
 * ## The branch is a bare name here, not a ref
 *
 * `searchCriteria.itemVersion.version` wants `main`, **not** `refs/heads/main`
 * — the opposite of the pull request endpoints in the same API. So this action
 * strips a `refs/heads/` prefix if one is given, which makes the same branch
 * value work everywhere in this app.
 *
 * A useful pattern this supports: `fromDate`/`toDate` bounded to a release
 * window gives the commits in a release, which is the raw material for release
 * notes that nobody has to write.
 */
const action: ActionDefinition = {
  key: "commit-list",
  type: "read",
  resource: "repository",
  title: "List commits",
  description:
    "Commit history, filterable by branch, author and date. The branch is a BARE name here, " +
    "unlike the pull request endpoints in the same API, so this normalises it.",
  params: [
    PROJECT_PARAM,
    { key: "repository", label: "Repository", type: "string", required: true, default: "" },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      default: "",
      hint: "A bare name. A `refs/heads/` prefix is stripped, so the same value works here and " +
        "in the pull request actions.",
    },
    {
      key: "author",
      label: "Author",
      type: "string",
      default: "",
      hint: "Matches the commit author's name or email as recorded in git.",
    },
    {
      key: "fromDate",
      label: "From",
      type: "datetime",
      default: "",
      hint: "Bounded to a release window, this is the raw material for release notes.",
    },
    { key: "toDate", label: "To", type: "datetime", default: "" },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "skip", label: "Skip", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "commits", type: "array", label: "Commits, newest first" },
    { key: "count", type: "number", label: "Commits returned" },
    { key: "authors", type: "array", label: "Distinct authors in this range" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const repository = String(p.repository ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!repository) throw new Error("`repository` is required");

    // A bare name here, unlike the pull request endpoints.
    const branch = String(p.branch ?? "").trim().replace(/^refs\/heads\//, "");

    const client = new AzureDevOpsClient(ctx);
    const commits = await client.list<{ author?: { name?: string } }>(
      client.path(project, "_apis/git/repositories", repository, "commits"),
      {
        query: query({
          "searchCriteria.itemVersion.version": branch || undefined,
          "searchCriteria.author": p.author,
          "searchCriteria.fromDate": p.fromDate,
          "searchCriteria.toDate": p.toDate,
          "searchCriteria.$top": Math.max(1, Number(p.limit ?? 100)),
          "searchCriteria.$skip": Number(p.skip ?? 0) || undefined,
        }),
      },
    );

    const authors = [
      ...new Set(commits.map((c) => String(c?.author?.name ?? "")).filter(Boolean)),
    ];
    return { commits, count: commits.length, authors };
  },
};

export default action;
