import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import listArchives from "../actions/list-archives.ts";

/** Look-back before the previous check, so a thread that lands late is still seen. */
export const OVERLAP_MS = 120_000;
export const PAGE_SIZE = 100;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface ArchiveChat {
  id: string;
  thread?: { id?: string };
}

/** Pages read per check; a longer window is drained over successive checks (§9.8). */
export const MAX_PAGES = 5;

export interface NewChatThreadState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
  /** Resume position of an unfinished window: LiveChat's `next_page_id` and the window's end. */
  drain?: { pageId: string; end: number };
}

/** LiveChat wants RFC 3339 with microseconds, e.g. `2026-11-09T12:00:00.000000+00:00`. */
export function rfc3339Micros(ms: number): string {
  return new Date(ms).toISOString().replace("Z", "000+00:00");
}

/**
 * Since-filter poll over `list_archives`: threads from `filters.from` (previous check minus an
 * overlap), newest first (`sort_order: "desc"`, documented), deduped by `chat.id:thread.id`.
 * Up to MAX_PAGES pages are read per check by following `next_page_id`; if more remain, the last
 * `next_page_id` is kept in state (`drain`) and the next check continues from it. The cursor only
 * moves to the window's end once a page has no `next_page_id`.
 */
export async function checkNewChatThread(
  state: unknown,
  ctx: HookContext,
): Promise<{ events: ArchiveChat[]; nextState: NewChatThreadState }> {
  const prior = state as { cursor?: unknown; drain?: NewChatThreadState["drain"] } | null;
  const seeded = typeof prior?.cursor === "number";
  const checkedAt = clock.now();
  const cursor = seeded ? prior!.cursor as number : checkedAt;
  const drain = seeded ? prior!.drain : undefined;
  const end = drain ? drain.end : checkedAt;

  const listed: ArchiveChat[] = [];
  let pageId: string | undefined = drain?.pageId;
  let drained = false;
  for (let page = 0; page < (seeded ? MAX_PAGES : 1); page++) {
    const res = await listArchives.execute(
      pageId
        ? { pageId }
        : { from: rfc3339Micros(cursor - OVERLAP_MS), sortOrder: "desc", limit: PAGE_SIZE },
      ctx,
    ) as { chats?: ArchiveChat[]; nextPageId?: string };
    listed.push(...(res.chats ?? []));
    pageId = res.nextPageId;
    if (!pageId) {
      drained = true;
      break;
    }
  }

  const { events, nextState } = await pollNewItems<ArchiveChat>({
    state,
    maxPages: 1,
    maxEvents: MAX_PAGES * PAGE_SIZE,
    seenWindow: 1000,
    idOf: (c) => `${c.id}:${c.thread?.id ?? ""}`,
    fetchPage: () => Promise.resolve({ items: listed }),
  });
  if (!seeded || drained) return { events, nextState: { ...nextState, cursor: end } };
  return { events, nextState: { ...nextState, cursor, drain: { pageId: pageId!, end } } };
}

export const newChatThreadTrigger: TriggerDefinition = {
  key: "new-chat-thread",
  title: "New Chat Thread",
  description:
    "The run gets each chat thread newly started in LiveChat (a new chat, or a returning customer's new thread).",
  output: [
    { key: "id", type: "string", label: "Chat ID" },
    { key: "thread", type: "object", label: "Thread (id, created_at, events)" },
    { key: "users", type: "array", label: "Chat participants" },
    { key: "properties", type: "object", label: "Chat properties" },
  ],
  sample: {
    id: "PJ0MRSHTDG",
    thread: { id: "K600PKZON8", created_at: "2026-11-09T12:00:00.000000Z", active: true },
    users: [{ id: "b7eff798-f8df-4364-8059-649c35c9ed0c", type: "customer" }],
    properties: {},
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewChatThread(state, ctx);
  },
};
