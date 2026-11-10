import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import chatList from "../actions/chat-list.ts";

/** Look-back before the previous check, so a chat whose last message lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Chats requested per page (the vendor maximum is 100). */
export const PAGE_SIZE = 100;
/** Pages read per check; a longer window is drained over successive checks (see `resume`). */
export const MAX_PAGES = 3;
/** Holds a full check's worth of ids plus the overlap re-list, so a re-listed chat is never re-emitted. */
export const SEEN_WINDOW = 600;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Chat {
  chat_id?: string;
  creation_time?: string;
  last_modified_time?: string;
}

/**
 * The kit's ids envelope plus: `cursor` (epoch ms the next window starts from), `floor` (epoch ms
 * of the seed; a chat created before it is never emitted) and, while a window is longer than
 * `MAX_PAGES` pages, `resume` (where the next check continues, and when this window began).
 */
interface SinceState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
  floor: number;
  resume?: { before: number; startedAt: number };
}

function isSeeded(state: unknown): state is SinceState {
  const s = state as Partial<SinceState> | null;
  return typeof s === "object" && s !== null && s.v === 1 && s.kind === "ids" &&
    s.seeded === true && Array.isArray(s.ids) && typeof s.cursor === "number" &&
    typeof s.floor === "number";
}

/** A chat created before the seed is not new; one with no parseable creation time is kept. */
function createdBefore(chat: Chat, floor: number): boolean {
  const created = Date.parse(chat.creation_time ?? "");
  return Number.isFinite(created) && created < floor;
}

// Shape (b), brief 9.1: chat-list filters by `modified_after` (the last message's time) and pages
// backwards with `modified_before`; it has no created-time filter, so a chat is "new" when it is
// listed, was created after the seed (the floor) and has not been emitted before.
const trigger: TriggerDefinition = {
  key: "new-chat",
  title: "New Chat",
  description:
    "The run gets each direct, group or bot chat that appears after the trigger was enabled (a chat is seen once it has a message).",
  output: [
    { key: "chat_id", type: "string", label: "Chat ID" },
    { key: "name", type: "string", label: "Chat name" },
    { key: "chat_type", type: "string", label: "Chat type" },
    { key: "creator_id", type: "string", label: "Creator user ID" },
    { key: "participant_count", type: "number", label: "Participants" },
    { key: "creation_time", type: "string", label: "Created at" },
    { key: "last_modified_time", type: "string", label: "Last message at" },
  ],
  sample: {
    chat_id: "2242135691980347663",
    name: "Scrum Bot",
    chat_type: "chat",
    creator_id: "631830849",
    participant_count: 3,
    creation_time: "2026-11-09T04:00:00-07:00",
    last_modified_time: "2026-11-09T04:05:00-07:00",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const now = clock.now();
    if (!isSeeded(state)) {
      // Seed: read nothing, emit nothing; remember when we started so older chats never fire.
      const seeded: SinceState = {
        v: 1,
        kind: "ids",
        seeded: true,
        ids: [],
        cursor: now,
        floor: now,
      };
      return { events: [], nextState: seeded };
    }
    const startedAt = state.resume?.startedAt ?? now;
    const since = state.cursor - OVERLAP_MS;
    let before = state.resume?.before;
    let drained = false;
    const { events, nextState } = await pollNewItems<Chat>({
      state,
      maxPages: 1,
      maxEvents: MAX_PAGES * PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (c) => String(c.chat_id ?? ""),
      async fetchPage() {
        const items: Chat[] = [];
        for (let n = 0; n < MAX_PAGES; n++) {
          const res = await chatList.execute(
            { limit: PAGE_SIZE, modifiedAfter: since, modifiedBefore: before },
            ctx,
          );
          const got = (res.chats ?? []) as Chat[];
          items.push(...got.filter((c) => !createdBefore(c, state.floor)));
          const oldest = Math.min(
            ...got.map((c) => Date.parse(c.last_modified_time ?? "")).filter(Number.isFinite),
          );
          // Second-granularity timestamps: step one second past the oldest so same-second chats
          // are re-listed (the id dedupe drops the repeats) rather than skipped.
          const next = oldest + 1000;
          if (
            got.length < PAGE_SIZE || !Number.isFinite(next) ||
            (before !== undefined && next >= before)
          ) {
            drained = true;
            break;
          }
          before = next;
        }
        return { items };
      },
    });
    const next: SinceState = {
      ...nextState,
      cursor: drained ? startedAt : state.cursor,
      floor: state.floor,
      ...(drained ? {} : { resume: { before: before as number, startedAt } }),
    };
    return { events, nextState: next };
  },
};

export default trigger;
