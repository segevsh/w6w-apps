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

export interface NewChatThreadState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
}

/** LiveChat wants RFC 3339 with microseconds, e.g. `2026-11-09T12:00:00.000000+00:00`. */
export function rfc3339Micros(ms: number): string {
  return new Date(ms).toISOString().replace("Z", "000+00:00");
}

/**
 * Since-filter poll over `list_archives`: threads from `filters.from` (previous check minus an
 * overlap), newest first (`sort_order: "desc"`, documented), deduped by `chat.id:thread.id`.
 */
export async function checkNewChatThread(
  state: unknown,
  ctx: HookContext,
): Promise<{ events: ArchiveChat[]; nextState: NewChatThreadState }> {
  const checkedAt = clock.now();
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const { events, nextState } = await pollNewItems<ArchiveChat>({
    state,
    maxPages: 1,
    seenWindow: 400,
    idOf: (c) => `${c.id}:${c.thread?.id ?? ""}`,
    async fetchPage() {
      const res = await listArchives.execute({
        from: rfc3339Micros(cursor - OVERLAP_MS),
        sortOrder: "desc",
        limit: PAGE_SIZE,
      }, ctx) as { chats?: ArchiveChat[] };
      return { items: res.chats ?? [] };
    },
  });
  return { events, nextState: { ...nextState, cursor: checkedAt } };
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
