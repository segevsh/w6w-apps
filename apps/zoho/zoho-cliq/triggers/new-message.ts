import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import messageList from "../actions/message-list.ts";

/** Look-back before the previous check, so a message stamped just before the cursor is still seen. */
export const OVERLAP_MS = 120_000;
/** The vendor returns at most 100 messages per call. */
export const PAGE_SIZE = 100;
/** Calls per check; a longer window is drained over successive checks (see `resume`). */
export const MAX_PAGES = 3;
/** Holds a full check's worth of ids plus the overlap re-list, so a re-listed message is never re-emitted. */
export const SEEN_WINDOW = 600;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Message {
  id?: string;
  time?: number;
}

/**
 * The kit's ids envelope plus `cursor` (epoch ms the next window starts from), `floor` (epoch ms of
 * the seed; a message stamped before it is never emitted) and, while a window is longer than
 * `MAX_PAGES` calls, `resume` (the part of the window still unread, and when the window began).
 */
interface SinceState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
  floor: number;
  resume?: { from: number; to: number; startedAt: number };
}

function isSeeded(state: unknown): state is SinceState {
  const s = state as Partial<SinceState> | null;
  return typeof s === "object" && s !== null && s.v === 1 && s.kind === "ids" &&
    s.seeded === true && Array.isArray(s.ids) && typeof s.cursor === "number" &&
    typeof s.floor === "number";
}

const times = (got: Message[]) =>
  got.map((m) => m.time).filter((t): t is number => Number.isFinite(t));

// Shape (b), brief 9.1: message-list filters by `fromtime`/`totime` (epoch ms) and returns at most
// 100 messages; the docs give no order for a window holding more, so a full page is continued from
// whichever end the page itself shows it was cut at (ascending: from = newest seen; descending:
// to = oldest seen). Ties on the boundary millisecond are re-listed and dropped by the id dedupe.
const trigger: TriggerDefinition = {
  key: "new-message",
  title: "New Message",
  description:
    "The run gets each message posted in the chosen chat or channel after the trigger was enabled.",
  params: [{
    key: "chatId",
    label: "Chat ID",
    type: "string",
    required: true,
    hint: "Chat id (e.g. `CT_1254880203691219668_11543281`). Channels have one too: it is the " +
      "channel's `chat_id`.",
  }],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "time", type: "number", label: "Sent at (epoch ms)" },
    { key: "type", type: "string", label: "Message type" },
    { key: "sender", type: "object", label: "Sender: { id, name }" },
    { key: "content", type: "object", label: "Content (e.g. { text })" },
  ],
  sample: {
    id: "1542711601585_349430767610289",
    time: 1542711601585,
    type: "text",
    sender: { name: "Scott", id: "12345678" },
    content: { text: "Hi! What time is the review meeting today?" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const chatId = String((params as { chatId?: unknown }).chatId ?? "");
    const now = clock.now();
    if (!isSeeded(state)) {
      // Seed: read nothing, emit nothing; remember when we started so older messages never fire.
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
    let from = state.resume?.from ?? state.cursor - OVERLAP_MS;
    let to = state.resume?.to ?? startedAt;
    let drained = false;
    const { events, nextState } = await pollNewItems<Message>({
      state,
      maxPages: 1,
      maxEvents: MAX_PAGES * PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (m) => String(m.id ?? ""),
      async fetchPage() {
        const items: Message[] = [];
        for (let n = 0; n < MAX_PAGES; n++) {
          const res = await messageList.execute(
            { chatId, fromTime: from, toTime: to, limit: PAGE_SIZE },
            ctx,
          );
          const got = res.messages as Message[];
          items.push(...got.filter((m) => !(typeof m.time === "number" && m.time < state.floor)));
          const t = times(got);
          if (got.length < PAGE_SIZE || t.length < 2) {
            drained = true;
            break;
          }
          const ascending = t[0] <= t[t.length - 1];
          const edge = ascending ? Math.max(...t) : Math.min(...t);
          if (ascending ? edge <= from : edge >= to) {
            // A full page that cannot narrow the window (one millisecond holds 100 messages).
            drained = true;
            break;
          }
          if (ascending) from = edge;
          else to = edge;
        }
        return { items };
      },
    });
    const next: SinceState = {
      ...nextState,
      cursor: drained ? startedAt : state.cursor,
      floor: state.floor,
      ...(drained ? {} : { resume: { from, to, startedAt } }),
    };
    return { events, nextState: next };
  },
};

export default trigger;
