import { sinceTrigger } from "../lib/since.ts";
import { collectAll, sinceParam } from "../lib/triggers.ts";
import { type RepoParams, WINDOW_ROWS } from "../lib/issues.ts";
import commitList from "../actions/commit-list.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

interface Commit {
  sha?: string;
  created?: string;
  html_url?: string;
  commit?: { message?: string; author?: { name?: string; date?: string } };
}

/**
 * Since-filter (brief 9.1 b): `GET /repos/{owner}/{repo}/commits` takes `since` ("only commits
 * after this date", ISO 8601), `page` and `limit`
 * (https://docs.gitea.com/api/1.24/#tag/repository/operation/repoGetAllCommits , verified
 * 2026-11-10). It lists the default branch. The commit's own date is the filter, so a commit
 * pushed later with an older date than the previous check is not seen. Safeguards 9.8 and 9.9
 * live in `lib/since.ts`.
 */
export default sinceTrigger<Commit, RepoParams>({
  key: "new-commit",
  title: "New Commit",
  description:
    "The run gets each commit newly made on the default branch of the chosen repository.",
  params: [REPO_PARAM, OWNER_PARAM],
  async fetchWindow(sinceMs, ctx, params) {
    const rows = await collectAll<Commit>(
      (limit) =>
        commitList.execute({
          repo: params.repo,
          owner: params.owner,
          since: sinceParam(sinceMs),
          limit,
        }, ctx),
      "commit window",
      WINDOW_ROWS,
      true,
    );
    if (rows.length >= WINDOW_ROWS) {
      ctx.log(
        "warn",
        `new-commit: window holds ${WINDOW_ROWS}+ commits; reading the first ${WINDOW_ROWS}`,
      );
    }
    return rows;
  },
  idOf: (commit) => String(commit.sha),
  timeOf: (commit) => {
    const at = commit.created ?? commit.commit?.author?.date;
    return at ? Date.parse(at) : undefined;
  },
  output: [
    { key: "sha", type: "string", label: "Commit SHA" },
    { key: "html_url", type: "string", label: "URL" },
    { key: "created", type: "string", label: "Committed at" },
    { key: "commit", type: "object", label: "Commit (message, author)" },
  ],
  sample: {
    sha: "3f2a9c1d5e7b4a6c8d0e1f2a3b4c5d6e7f8a9b0c",
    html_url: "https://git.example.test/acme/api/commit/3f2a9c1d5e7b",
    created: "2026-11-09T10:00:00Z",
    commit: { message: "Add retries", author: { name: "Alex Dev", date: "2026-11-09T10:00:00Z" } },
  },
});
