import type { HookContext, TriggerDefinition } from "@w6w/types";
import action from "../actions/recording-get-many.ts";
import { pollNewItems } from "../../_shared/poll/mod.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Pages read per check. A longer window is resumed on the next check (never re-read from page 1). */
export const MAX_PAGES = 3;
const SEEN_WINDOW = 2000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** A vendor paging position: a page number, an offset or an opaque cursor. */
export type Pos = string | number;

/** The kit's ids envelope plus the since-filter cursor and, mid-window, the resume position. */
export interface WindowState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  /** Epoch ms of the last fully drained check. */
  cursor: number;
  /** Epoch ms of the seed check: a record stamped before it is never emitted (brief §9.9). */
  floor: number;
  resume?: { sinceMs: number; pos: Pos; checkedAt: number };
}

function isSeeded(state: unknown): state is WindowState {
  const s = state as Partial<WindowState> | null;
  return typeof s === "object" && s !== null && s.v === 1 && s.kind === "ids" &&
    s.seeded === true && Array.isArray(s.ids) && typeof s.cursor === "number" &&
    typeof s.floor === "number";
}

/**
 * Since-filter poll (brief §9.1 b + §9.8). Each check reads the window `[cursor - overlap, now]`
 * through the wrapped list action, at most `MAX_PAGES` pages. A window that is not drained is
 * resumed from its saved position on the next check (same `since`), and the cursor only advances
 * to the first check's start once the window is drained. The first check reads nothing: it records
 * the cursor and `floor = now`, and every later check drops a record whose own `stampOf` time is
 * before `floor` (a record with no parseable stamp is kept), so nothing that existed before the
 * seed is ever emitted however many pages the overlap window holds (brief §9.9).
 * Dedupe is by `idOf` through the kit's seen-id window.
 */
export async function pollWindow<T>(o: {
  state: unknown;
  read(
    sinceIso: string,
    pos: Pos | undefined,
    ctx: HookContext,
  ): Promise<{ items: T[]; next?: Pos }>;
  idOf(item: T): string;
  /** Client-side filter for records the vendor can only select by modification time. */
  keep?(item: T, sinceMs: number): boolean;
  /** The record's own creation (new-*) or update (new-or-updated-*) stamp, for the seed floor. */
  stampOf(item: T): string | undefined;
  ctx: HookContext;
}): Promise<{ events: T[]; nextState: WindowState }> {
  const checkedAt = clock.now();
  const prior = isSeeded(o.state) ? o.state : undefined;
  const gathered: T[] = [];
  let next: Pos | undefined;
  let sinceMs = checkedAt;
  if (prior) {
    sinceMs = prior.resume?.sinceMs ?? prior.cursor - OVERLAP_MS;
    let pos = prior.resume?.pos;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await o.read(new Date(sinceMs).toISOString(), pos, o.ctx);
      for (const item of res.items) {
        const at = Date.parse(o.stampOf(item) ?? "");
        if (at < prior.floor) continue;
        if (!o.keep || o.keep(item, sinceMs)) gathered.push(item);
      }
      next = res.next;
      if (next === undefined) break;
      pos = next;
    }
  }
  const { events, nextState } = await pollNewItems<T>({
    state: prior ?? {},
    fetchPage: () => Promise.resolve({ items: gathered }),
    idOf: o.idOf,
    maxPages: 1,
    maxEvents: Number.POSITIVE_INFINITY,
    seenWindow: SEEN_WINDOW,
  });
  const windowStart = prior?.resume?.checkedAt ?? checkedAt;
  const state: WindowState = {
    ...nextState,
    cursor: !prior || next === undefined ? windowStart : prior.cursor,
    floor: prior?.floor ?? checkedAt,
  };
  if (prior && next !== undefined) state.resume = { sinceMs, pos: next, checkedAt: windowStart };
  return { events, nextState: state };
}

interface Meeting {
  uuid: string;
  start_time?: string;
}

interface RecordingPage {
  meetings?: Meeting[];
  next_page_token?: string;
}

const DAY_MS = 86_400_000;
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * `GET /users/{userId}/recordings` takes `from` / `to` as `yyyy-mm-dd` UTC dates ("The maximum
 * range can be a month"; without them it defaults to the current date) and pages with
 * `next_page_token` (valid 15 minutes). The docs do not say whether `to` is inclusive; their own
 * default window is `[today, tomorrow]` (request on June 30 -> `from` 2020-06-30, `to` 2020-07-01),
 * so `to` is tomorrow's UTC date and today's recordings are visible either way. A check reads
 * `[day(since), tomorrow]`, clamped to the 30 days the vendor allows, with the maximum page size
 * (300) so a window rarely needs a token, and resumes an undrained window with that token. A token the vendor
 * no longer accepts restarts the window from its first page (ids are deduped, so nothing repeats).
 */
async function fetchSince(
  userId: string | undefined,
  sinceIso: string,
  pos: Pos | undefined,
  ctx: HookContext,
): Promise<{ items: Meeting[]; next?: Pos }> {
  const now = clock.now();
  const toMs = now + DAY_MS;
  const to = day(toMs);
  const from = day(Math.max(Date.parse(sinceIso), toMs - 30 * DAY_MS));
  const call = (nextPageToken?: string) =>
    action.execute!({ userId, from, to, pageSize: 300, nextPageToken }, ctx) as Promise<
      RecordingPage
    >;
  let res: RecordingPage;
  try {
    res = await call(typeof pos === "string" ? pos : undefined);
  } catch (err) {
    if (typeof pos !== "string") throw err;
    res = await call();
  }
  return { items: res.meetings ?? [], next: res.next_page_token || undefined };
}

export const newRecordingTrigger: TriggerDefinition = {
  key: "new-recording",
  title: "New Cloud Recording",
  description: "The run gets each meeting whose cloud recording is newly available for the user.",
  params: [{
    key: "userId",
    label: "User",
    type: "string",
    default: "me",
    hint: "Zoom user id or email whose recordings to watch; `me` is the connected account.",
  }],
  output: [
    { key: "uuid", type: "string", label: "Meeting UUID" },
    { key: "id", type: "number", label: "Meeting ID" },
    { key: "topic", type: "string", label: "Topic" },
    { key: "start_time", type: "string", label: "Start time" },
    { key: "recording_count", type: "number", label: "Recording files" },
    { key: "share_url", type: "string", label: "Share URL" },
    { key: "recording_files", type: "array", label: "Recording files" },
  ],
  sample: {
    uuid: "4444AAAiAAAAAiAiAiiAii==",
    id: 1100000,
    topic: "Weekly sync",
    start_time: "2026-11-09T09:00:00Z",
    recording_count: 2,
    share_url: "https://zoom.us/rec/share/abc",
    recording_files: [],
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    const userId = (params as { userId?: string }).userId;
    return pollWindow<Meeting>({
      state,
      ctx,
      read: (since, pos, c) => fetchSince(userId, since, pos, c),
      stampOf: (m) => m.start_time,
      idOf: (m) => String(m.uuid),
    });
  },
};
