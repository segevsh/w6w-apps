import type { HookContext } from "@w6w/types";
import { ConfluenceClient, csv, cursorFromNext } from "./client.ts";
import { pollWindow, toMs } from "./window.ts";

/** Overlap re-read on every check, so a task stamped just before the last check is not missed. */
export const OVERLAP_MS = 3_600_000;
/** Pages one check reads; the rest of a longer window is resumed on the next check (brief 9.8). */
export const MAX_PAGES = 3;
/** `limit` on the wire (documented maximum is 250). */
export const PAGE_SIZE = 100;
const SEEN_WINDOW = 500;

export const clock = { now: (): number => Date.now() };

type Task = Record<string, unknown>;

/**
 * `GET /wiki/api/v2/tasks?created-at-from=<since ms>`, following the `_links.next` cursor for at
 * most {@link MAX_PAGES} pages per check and resuming a longer window on the next check.
 */
export function pollTasks(state: unknown, params: Record<string, unknown>, ctx: HookContext) {
  const client = new ConfluenceClient(ctx);
  return pollWindow<Task, string>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf: (task) => {
      if (task.id === undefined || task.id === null || task.id === "") {
        throw new Error("Confluence task has no id");
      }
      return String(task.id);
    },
    tsOf: (task) => toMs(task.createdAt),
    async load(sinceMs, cursor) {
      const page = await client.request<{ results?: Task[]; _links?: { next?: string } }>(
        "/tasks",
        {
          query: {
            "created-at-from": sinceMs,
            "space-id": csv(params.spaceId),
            limit: PAGE_SIZE,
            cursor,
          },
        },
      );
      return { items: page?.results ?? [], next: cursorFromNext(page?._links?.next) };
    },
  });
}
