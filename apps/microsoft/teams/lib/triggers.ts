import type { HookContext } from "@w6w/types";
import { pollNewItems, pollSnapshot } from "../../_shared/poll/mod.ts";
import listChats from "../actions/list-chats.ts";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/**
 * How often these polls may run. The App's README records Microsoft's Teams API terms as capping a
 * poll for changes at once per day (the existing New Channel Message trigger declares the same
 * floor). Kept in one place so it can be relaxed with a single edit if that reading is wrong.
 */
export const TEAMS_MIN_INTERVAL_MS = 86_400_000;

/**
 * A list action as the triggers read it: just its `execute`. The input is typed `never` so any
 * action's own input type is assignable; callers pass the object the action's params describe.
 */
interface ListAction {
  execute(input: never, ctx: HookContext): unknown;
}

interface Listed {
  value?: Array<Record<string, unknown>>;
  nextLink?: string;
}

/** Page budget of a snapshot read: `pages` requests at most; a longer list fails the check. */
export const SNAPSHOT_MAX_PAGES = 10;

/**
 * Run a Graph list action (the SAME request the action makes) and diff the whole collection with
 * the last check. Only rows that were added are emitted; a rename or other edit is not an event.
 * A collection longer than the page budget fails the check loudly instead of being half-read.
 */
export async function snapshotAdded(
  action: ListAction,
  input: Record<string, unknown>,
  state: unknown,
  ctx: HookContext,
  noun: string,
): Promise<{ events: unknown[]; nextState: unknown }> {
  const res = await action.execute(
    { ...input, all: true, maxPages: SNAPSHOT_MAX_PAGES } as never,
    ctx,
  ) as Listed;
  if (res.nextLink) {
    throw new Error(
      `more than ${SNAPSHOT_MAX_PAGES} pages of ${noun} in one list; this trigger cannot snapshot it`,
    );
  }
  const { events, nextState } = await pollSnapshot({
    state,
    rows: (res.value ?? []).map((row) => ({ key: String(row.id ?? ""), values: row })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => e.values), nextState };
}

/** Chats per page (Graph's documented maximum `$top`) and pages read per check. */
export const CHAT_PAGE_SIZE = 50;
export const CHAT_MAX_PAGES = 3;
/** One check can read CHAT_MAX_PAGES full pages, so none of them may be held back for later. */
const CHAT_MAX_EVENTS = CHAT_PAGE_SIZE * CHAT_MAX_PAGES;

/** The kit's ids envelope plus `floor`: epoch ms of the seed. */
export interface NewChatState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  floor: number;
}

interface Chat {
  id: string;
  createdDateTime?: string;
}

function readChatState(state: unknown): NewChatState | null {
  const s = state as Partial<NewChatState> | null;
  if (
    !s || s.v !== 1 || s.kind !== "ids" || s.seeded !== true || !Array.isArray(s.ids) ||
    typeof s.floor !== "number"
  ) return null;
  return s as NewChatState;
}

/**
 * One check of New Chat. `GET /me/chats` is ordered by the last message, not by creation, so an
 * old chat that gets a message jumps to the top and would look new. Seed: remember `floor = now`
 * (epoch ms), read nothing. Later checks emit only a chat whose own `createdDateTime` is not
 * before the floor; every chat read is marked seen, emitted or not.
 */
export async function checkNewChat(
  state: unknown,
  ctx: HookContext,
): Promise<{ events: Chat[]; nextState: NewChatState }> {
  const prior = readChatState(state);
  if (!prior) {
    return {
      events: [],
      nextState: { v: 1, kind: "ids", seeded: true, ids: [], floor: clock.now() },
    };
  }
  const chats: ListAction = listChats;
  const pages: Array<Record<string, unknown>> = [{
    orderby: "lastMessagePreview/createdDateTime desc",
    top: CHAT_PAGE_SIZE,
    all: false,
  }];
  const { events, nextState } = await pollNewItems<Chat>({
    state: prior,
    maxPages: CHAT_MAX_PAGES,
    maxEvents: CHAT_MAX_EVENTS,
    seenWindow: 2 * CHAT_MAX_EVENTS,
    idOf: (c) => c.id,
    async fetchPage(pageToken) {
      const index = pageToken === undefined ? 0 : Number(pageToken);
      const res = await chats.execute(pages[index] as never, ctx) as Listed;
      if (res.nextLink) pages[index + 1] = { nextLink: res.nextLink, all: false };
      return {
        items: (res.value ?? []) as unknown as Chat[],
        nextPageToken: res.nextLink ? String(index + 1) : undefined,
      };
    },
  });
  const fresh = events.filter((c) => {
    const created = Date.parse(c.createdDateTime ?? "");
    return Number.isNaN(created) || created >= prior.floor;
  });
  return { events: fresh, nextState: { ...nextState, floor: prior.floor } };
}
