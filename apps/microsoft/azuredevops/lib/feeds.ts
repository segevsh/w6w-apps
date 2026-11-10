import type { HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import commitList from "../actions/commit-list.ts";
import pullRequestList from "../actions/pull-request-list.ts";
import { pollWindow } from "./window.ts";

/** Test seam: the since-filter triggers read the time through this object. */
export const clock = { now: (): number => Date.now() };

const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
/** Ref/definition/project listings answer at most this many rows per request. */
export const SNAPSHOT_TOP = 1000;

const msOf = (value: unknown): number | undefined => {
  const ms = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isNaN(ms) ? undefined : ms;
};

interface Commit {
  commitId?: unknown;
  committer?: { date?: unknown };
}

/**
 * Commits of one repository since the previous check. `searchCriteria.fromDate`/`toDate` bound the
 * window and `$skip`/`$top` page it; the window's upper bound is pinned for a multi-page drain so
 * arrivals cannot shift the offset (brief 9.8). Ids dedupe, the seed floor drops older commits (9.9).
 */
export function pollCommits(
  params: { project: string; repository: string; branch?: string },
  state: unknown,
  ctx: HookContext,
) {
  return pollWindow<Commit, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: 1000,
    idOf: (c) => String(c.commitId ?? ""),
    tsOf: (c) => msOf(c.committer?.date),
    async load(since, skip, until) {
      const res = await commitList.execute({
        project: params.project,
        repository: params.repository,
        branch: params.branch ?? "",
        fromDate: new Date(since).toISOString(),
        toDate: new Date(until).toISOString(),
        limit: PAGE_SIZE,
        skip: skip ?? 0,
      }, ctx) as { commits?: Commit[] };
      const items = res.commits ?? [];
      return { items, next: items.length >= PAGE_SIZE ? (skip ?? 0) + PAGE_SIZE : undefined };
    },
  });
}

interface PullRequest {
  pullRequestId?: unknown;
  creationDate?: unknown;
}

/** Pull requests (any status) of one repository created since the previous check (`minTime`). */
export function pollPullRequests(
  params: { project: string; repository: string },
  state: unknown,
  ctx: HookContext,
) {
  return pollWindow<PullRequest, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: 1000,
    idOf: (pr) => String(pr.pullRequestId ?? ""),
    tsOf: (pr) => msOf(pr.creationDate),
    async load(since, skip, until) {
      const res = await pullRequestList.execute({
        project: params.project,
        repository: params.repository,
        status: "all",
        minTime: new Date(since).toISOString(),
        maxTime: new Date(until).toISOString(),
        limit: PAGE_SIZE,
        skip: skip ?? 0,
      }, ctx) as { pullRequests?: PullRequest[] };
      const items = res.pullRequests ?? [];
      return { items, next: items.length >= PAGE_SIZE ? (skip ?? 0) + PAGE_SIZE : undefined };
    },
  });
}

/**
 * A bounded listing diffed against the previous check (`pollSnapshot`, added only). A listing that
 * fills the vendor's per-request cap may be truncated, so it throws rather than guess.
 */
export async function snapshotAdded<T>(
  state: unknown,
  rows: T[],
  keyOf: (row: T) => string,
  what: string,
) {
  if (rows.length >= SNAPSHOT_TOP) {
    throw new Error(
      `${what}: the listing reached ${SNAPSHOT_TOP} rows, the most one request returns, so new ones cannot be told apart reliably`,
    );
  }
  const { events, nextState } = await pollSnapshot({
    state,
    rows: rows.map((r) => ({ key: keyOf(r), values: { id: keyOf(r) } })),
    emit: { added: true, updated: false },
  });
  const byKey = new Map(rows.map((r) => [keyOf(r), r]));
  return { events: events.map((e) => byKey.get(e.key)), nextState };
}
