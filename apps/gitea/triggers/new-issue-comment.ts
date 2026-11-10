import { sinceTrigger } from "../lib/since.ts";
import issueCommentList from "../actions/issue-comment-list.ts";
import { sinceParam } from "../lib/triggers.ts";
import { timeMs } from "../lib/issues.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

interface Comment {
  id?: number;
  body?: string;
  html_url?: string;
  user?: { login?: string };
  created_at?: string;
  updated_at?: string;
}

interface Params {
  repo?: string;
  owner?: string;
  issueNumber?: number | string;
}

/**
 * Since-filter (brief 9.1 b): `GET /repos/{owner}/{repo}/issues/{index}/comments` documents
 * `since` (updated after, RFC 3339) and `before`, and NO `page`/`limit`: it answers every comment
 * of the issue in one response (Gitea swagger `issueGetComments`,
 * https://gitea.com/swagger.v1.json , verified 2026-11-10). So the window is ONE request through
 * the action, which no longer walks a pager. Safeguards 9.8 and 9.9 live in `lib/since.ts`.
 */
export default sinceTrigger<Comment, Params>({
  key: "new-issue-comment",
  title: "New Issue Comment",
  description:
    "The run gets each new comment on one issue or pull request of the chosen repository.",
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    {
      key: "issueNumber",
      label: "Issue or PR Number",
      type: "number",
      required: true,
      hint: "The issue or pull request to watch.",
    },
  ],
  async fetchWindow(sinceMs, ctx, params) {
    const number = Number(params.issueNumber);
    if (!Number.isInteger(number) || number < 1) {
      throw new Error("Set Issue or PR Number to the issue to watch.");
    }
    const out = await issueCommentList.execute({
      repo: params.repo,
      owner: params.owner,
      issueNumber: number,
      since: sinceParam(sinceMs),
      returnAll: true,
    }, ctx);
    return Array.isArray(out) ? out as Comment[] : [];
  },
  idOf: (c) => String(c.id),
  timeOf: (c) => timeMs(c.created_at),
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "body", type: "string", label: "Body" },
    { key: "html_url", type: "string", label: "URL" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    id: 9001,
    body: "Reproduced on 1.24.",
    html_url: "https://git.example.test/acme/api/issues/41#issuecomment-9001",
    user: { login: "alice" },
    created_at: "2026-11-09T10:05:00Z",
    updated_at: "2026-11-09T10:05:00Z",
  },
});
