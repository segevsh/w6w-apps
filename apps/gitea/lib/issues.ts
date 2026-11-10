import type { HookContext } from "@w6w/types";
import issueList from "../actions/issue-list.ts";
import { collectAll, sinceParam } from "./triggers.ts";

/** Rows read per check; a window past it is cut with a warning, not stalled. */
export const WINDOW_ROWS = 4000;

export interface Issue {
  id?: number;
  number?: number;
  title?: string;
  state?: string;
  html_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RepoParams {
  repo?: string;
  owner?: string;
}

/**
 * Every issue (pull requests excluded by `type=issues`) updated since `sinceMs`, any state.
 * `GET /repos/{owner}/{repo}/issues` documents `since` ("only show items updated after the given
 * time", RFC 3339), `state=all`, `type`, `page` and `limit`
 * (https://docs.gitea.com/api/1.24/#tag/issue/operation/issueListIssues , verified 2026-11-10).
 */
export async function issueWindow(
  sinceMs: number,
  ctx: HookContext,
  params: RepoParams,
  key: string,
): Promise<Issue[]> {
  const rows = await collectAll<Issue>(
    (limit) =>
      issueList.execute({
        repo: params.repo,
        owner: params.owner,
        type: "issues",
        state: "all",
        since: sinceParam(sinceMs),
        limit,
      }, ctx),
    "issue window",
    WINDOW_ROWS,
    true,
  );
  if (rows.length >= WINDOW_ROWS) {
    ctx.log(
      "warn",
      `${key}: window holds ${WINDOW_ROWS}+ issues; reading the first ${WINDOW_ROWS}`,
    );
  }
  return rows;
}

export const issueOutput = [
  { key: "id", type: "number" as const, label: "Issue ID" },
  { key: "number", type: "number" as const, label: "Number" },
  { key: "title", type: "string" as const, label: "Title" },
  { key: "state", type: "string" as const, label: "State" },
  { key: "html_url", type: "string" as const, label: "URL" },
  { key: "created_at", type: "string" as const, label: "Created" },
  { key: "updated_at", type: "string" as const, label: "Updated" },
];

export const issueSample = {
  id: 5001,
  number: 41,
  title: "Retry on 502",
  state: "open",
  html_url: "https://git.example.test/acme/api/issues/41",
  created_at: "2026-11-09T10:00:00Z",
  updated_at: "2026-11-09T10:00:00Z",
};

export const timeMs = (iso: string | undefined): number | undefined =>
  iso ? Date.parse(iso) : undefined;
