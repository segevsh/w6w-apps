import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollNewItems, pollSnapshot } from "../../_shared/poll/mod.ts";
import getManyDrafts from "../actions/get-many-drafts.ts";
import getManyLabels from "../actions/get-many-labels.ts";
import getManyMessages from "../actions/get-many-messages.ts";
import getManyThreads from "../actions/get-many-threads.ts";
import getMessage from "../actions/get-message.ts";

/** Seconds of look-back before the previous check, so a message that lands late is still seen. */
export const OVERLAP_SECONDS = 120;
/** Page size requested from `users/me/messages`. */
export const PAGE_SIZE = 100;
/** Per-check ceiling: 5 pages of 100. Older mail beyond it in one window is not emitted. */
export const MAX_PAGES = 5;
export const MAX_EVENTS = 500;
/** At least MAX_EVENTS + one page, so an overlap re-list never evicts an id emitted last check. */
export const SEEN_WINDOW = 600;
const METADATA_HEADERS = ["From", "To", "Cc", "Subject", "Date"];

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface NewEmailParams {
  q?: string;
  labelIds?: string[];
  includeBody?: boolean;
}

/** The kit's ids envelope plus the epoch second of the last successful check. */
export interface NewEmailState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
}

export interface NewEmailEvent {
  id: string;
  threadId: string;
  from: string | null;
  to: string | null;
  cc: string | null;
  subject: string | null;
  snippet: string;
  date: string | null;
  labelIds: string[];
  body?: string;
}

interface Part {
  mimeType?: string;
  body?: { data?: string };
  parts?: Part[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: Part & { headers?: Array<{ name: string; value: string }> };
}

export const NEW_EMAIL_PARAMS: Param[] = [
  {
    key: "q",
    label: "Search query",
    type: "string",
    hint: "Optional Gmail search, e.g. `from:boss is:unread`. A time window is added for you.",
  },
  {
    key: "labelIds",
    label: "Label IDs",
    type: "string",
    repeat: true,
    hint: "Only mail carrying these labels, e.g. INBOX.",
  },
  {
    key: "includeBody",
    label: "Include body",
    type: "boolean",
    default: false,
    hint: "Fetch the full message and add its text body to the event.",
  },
];

export const NEW_EMAIL_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Message ID" },
  { key: "threadId", type: "string", label: "Thread ID" },
  { key: "from", type: "string", label: "From" },
  { key: "to", type: "string", label: "To" },
  { key: "cc", type: "string", label: "Cc" },
  { key: "subject", type: "string", label: "Subject" },
  { key: "snippet", type: "string", label: "Snippet" },
  { key: "date", type: "string", label: "Date" },
  { key: "labelIds", type: "array", label: "Label IDs" },
  { key: "body", type: "string", label: "Body (only with Include body)" },
];

export const NEW_EMAIL_SAMPLE: NewEmailEvent = {
  id: "18c2f4a1b2d3e4f5",
  threadId: "18c2f4a1b2d3e4f5",
  from: "Boss <boss@example.com>",
  to: "me@example.com",
  cc: null,
  subject: "Quarterly numbers",
  snippet: "Can you send the numbers before noon?",
  date: "Mon, 9 Nov 2026 09:00:00 +0000",
  labelIds: ["INBOX", "UNREAD"],
};

/** Gmail `after:` takes epoch seconds. */
export function buildQuery(userQuery: string | undefined, cursorSeconds: number): string {
  const after = `after:${cursorSeconds - OVERLAP_SECONDS}`;
  const q = userQuery?.trim();
  return q ? `${q} ${after}` : after;
}

function decode(data: string): string {
  const bin = atob(data.replaceAll("-", "+").replaceAll("_", "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function findBody(part: Part | undefined, mime: string): string | undefined {
  if (!part) return undefined;
  if (part.mimeType === mime && part.body?.data) return decode(part.body.data);
  for (const p of part.parts ?? []) {
    const found = findBody(p, mime);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function toEvent(msg: GmailMessage, includeBody: boolean): NewEmailEvent {
  const headers = new Map<string, string>();
  for (const h of msg.payload?.headers ?? []) headers.set(h.name.toLowerCase(), h.value);
  const event: NewEmailEvent = {
    id: msg.id,
    threadId: msg.threadId,
    from: headers.get("from") ?? null,
    to: headers.get("to") ?? null,
    cc: headers.get("cc") ?? null,
    subject: headers.get("subject") ?? null,
    snippet: msg.snippet ?? "",
    date: headers.get("date") ?? null,
    labelIds: msg.labelIds ?? [],
  };
  if (includeBody) {
    event.body = findBody(msg.payload, "text/plain") ?? findBody(msg.payload, "text/html") ?? "";
  }
  return event;
}

/** One check: list (get-many-messages request), then hydrate each new id (get-message request). */
export async function checkNewEmail(
  params: NewEmailParams,
  state: unknown,
  ctx: HookContext,
): Promise<{ events: NewEmailEvent[]; nextState: NewEmailState }> {
  const checkedAt = Math.floor(clock.now() / 1000);
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const includeBody = params.includeBody === true;

  const { events: listed, nextState } = await pollNewItems<{ id: string }>({
    state,
    maxPages: MAX_PAGES,
    maxEvents: MAX_EVENTS,
    seenWindow: SEEN_WINDOW,
    idOf: (m) => m.id,
    async fetchPage(pageToken) {
      const res = await getManyMessages.execute({
        q: buildQuery(params.q, cursor),
        labelIds: params.labelIds,
        maxResults: PAGE_SIZE,
        pageToken,
      }, ctx) as { messages?: Array<{ id: string }>; nextPageToken?: string };
      return { items: res.messages ?? [], nextPageToken: res.nextPageToken };
    },
  });

  const events: NewEmailEvent[] = [];
  for (const { id } of listed) {
    try {
      const msg = await getMessage.execute(
        includeBody
          ? { messageId: id, format: "full" }
          : { messageId: id, format: "metadata", metadataHeaders: METADATA_HEADERS },
        ctx,
      ) as GmailMessage;
      events.push(toEvent(msg, includeBody));
    } catch (err) {
      // Deleted between list and get: nothing to emit, and it must not wedge every later check.
      if (err instanceof Error && / 404 /.test(err.message)) continue;
      throw err;
    }
  }
  return { events, nextState: { ...nextState, cursor: checkedAt } };
}

export const newEmailTrigger: TriggerDefinition<NewEmailParams> = {
  key: "new-email",
  title: "New Email",
  description:
    "Runs when a new message arrives in the mailbox (optionally matching a search and labels). The run gets the message's sender, recipients, subject, snippet, date and labels, plus the text body when asked.",
  params: NEW_EMAIL_PARAMS,
  output: NEW_EMAIL_OUTPUT,
  sample: NEW_EMAIL_SAMPLE,
  minIntervalMs: 60_000,
  poll({ params, state }, ctx) {
    return checkNewEmail(params, state, ctx);
  },
};

// ---------------------------------------------------------------------------------------------
// New Label / New Draft: bounded snapshots (the whole collection fits in one run of requests).
// ---------------------------------------------------------------------------------------------

/** Gmail's `drafts.list` takes `maxResults` up to 500. */
export const DRAFT_PAGE_SIZE = 500;
/** 10 pages of 500 = the snapshot kit's 5000-row cap. A mailbox with more drafts fails loudly. */
export const DRAFT_MAX_PAGES = 10;

export interface GmailLabel {
  id: string;
  name?: string;
  type?: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
}

export interface GmailDraft {
  id: string;
  message?: { id: string; threadId: string };
}

export const NEW_LABEL_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Label ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "type", type: "string", label: "Type (system or user)" },
  { key: "messageListVisibility", type: "string", label: "Message list visibility" },
  { key: "labelListVisibility", type: "string", label: "Label list visibility" },
];

export const NEW_LABEL_SAMPLE: GmailLabel = {
  id: "Label_1234567890",
  name: "Invoices",
  type: "user",
  messageListVisibility: "show",
  labelListVisibility: "labelShow",
};

export const NEW_DRAFT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Draft ID" },
  { key: "message.id", type: "string", label: "Draft message ID" },
  { key: "message.threadId", type: "string", label: "Thread ID" },
];

export const NEW_DRAFT_SAMPLE: GmailDraft = {
  id: "r-1234567890123456789",
  message: { id: "18c2f4a1b2d3e4f5", threadId: "18c2f4a1b2d3e4f5" },
};

/** Labels the account has now vs. the last check; only labels that were added are emitted. */
export async function checkNewLabels(
  state: unknown,
  ctx: HookContext,
): Promise<{ events: GmailLabel[]; nextState: unknown }> {
  const res = await getManyLabels.execute({}, ctx) as { labels?: GmailLabel[] };
  const labels = res.labels ?? [];
  const { events, nextState } = await pollSnapshot({
    state,
    rows: labels.map((l) => ({ key: l.id, values: l })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => e.values as GmailLabel), nextState };
}

/** Drafts the account has now vs. the last check; only drafts that were added are emitted. */
export async function checkNewDrafts(
  state: unknown,
  ctx: HookContext,
): Promise<{ events: GmailDraft[]; nextState: unknown }> {
  const drafts: GmailDraft[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < DRAFT_MAX_PAGES; page++) {
    const res = await getManyDrafts.execute(
      { maxResults: DRAFT_PAGE_SIZE, pageToken },
      ctx,
    ) as { drafts?: GmailDraft[]; nextPageToken?: string };
    drafts.push(...(res.drafts ?? []));
    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }
  if (pageToken) {
    throw new Error(
      `Gmail has more than ${
        DRAFT_MAX_PAGES * DRAFT_PAGE_SIZE
      } drafts; New Draft cannot snapshot a mailbox that large`,
    );
  }
  const { events, nextState } = await pollSnapshot({
    state,
    rows: drafts.map((d) => ({ key: d.id, values: d })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => e.values as GmailDraft), nextState };
}

export const newLabelTrigger: TriggerDefinition<Record<string, never>> = {
  key: "new-label",
  title: "New Label",
  description:
    "Runs when a new label is created in the mailbox. The run gets the label's id, name, type and visibility settings.",
  output: NEW_LABEL_OUTPUT,
  sample: NEW_LABEL_SAMPLE,
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewLabels(state, ctx);
  },
};

export const newDraftTrigger: TriggerDefinition<Record<string, never>> = {
  key: "new-draft",
  title: "New Draft",
  description:
    "Runs when a new draft is saved in the mailbox. The run gets the draft's id and its message and thread ids; use Get Draft for the content.",
  output: NEW_DRAFT_OUTPUT,
  sample: NEW_DRAFT_SAMPLE,
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewDrafts(state, ctx);
  },
};

// ---------------------------------------------------------------------------------------------
// New or Updated Thread: a since-filter poll (Gmail threads.list has no documented order).
// ---------------------------------------------------------------------------------------------

/** Thread pages per check; the window resumes on the next check when it holds more. */
export const THREAD_MAX_PAGES = 3;
export const THREAD_SEEN_WINDOW = 600;

export interface ThreadParams {
  q?: string;
  labelIds?: string[];
}

export interface GmailThread {
  id: string;
  snippet?: string;
  historyId?: string;
}

/**
 * The kit's ids envelope plus the window bookkeeping:
 * - `cursor`: epoch second the last fully drained window started at,
 * - `floor`: epoch second of the seed; nothing dated before it is ever asked for (§9.9),
 * - `resume`: set while a window is only partly read — the page token to continue from.
 */
export interface ThreadState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
  floor: number;
  resume?: { after: number; until: number; pageToken: string };
}

export const NEW_OR_UPDATED_THREAD_PARAMS: Param[] = [
  {
    key: "q",
    label: "Search query",
    type: "string",
    hint: "Optional Gmail search, e.g. `from:boss`. A time window is added for you.",
  },
  {
    key: "labelIds",
    label: "Label IDs",
    type: "string",
    repeat: true,
    hint: "Only threads carrying these labels, e.g. INBOX.",
  },
];

export const NEW_OR_UPDATED_THREAD_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Thread ID" },
  { key: "snippet", type: "string", label: "Snippet" },
  { key: "historyId", type: "string", label: "History ID" },
];

export const NEW_OR_UPDATED_THREAD_SAMPLE: GmailThread = {
  id: "18c2f4a1b2d3e4f5",
  snippet: "Can you send the numbers before noon?",
  historyId: "4711042",
};

function readThreadState(state: unknown): ThreadState | null {
  const s = state as Partial<ThreadState> | null;
  if (
    !s || s.v !== 1 || s.kind !== "ids" || s.seeded !== true || !Array.isArray(s.ids) ||
    typeof s.cursor !== "number" || typeof s.floor !== "number"
  ) return null;
  return s as ThreadState;
}

/** A thread is "new or updated" as `id:historyId`: Gmail bumps `historyId` on every change to it. */
export const threadEventId = (t: GmailThread): string => `${t.id}:${t.historyId ?? ""}`;

/**
 * One check. Seed: remember `floor = now`, read nothing. Later checks ask `threads.list` for
 * `after:max(cursor - overlap, floor)` so a thread whose mail predates the seed is never asked
 * for; a window with more than THREAD_MAX_PAGES pages is read across checks (`resume`) and the
 * cursor only moves once it is drained.
 */
export async function checkThreads(
  params: ThreadParams,
  state: unknown,
  ctx: HookContext,
): Promise<{ events: GmailThread[]; nextState: ThreadState }> {
  const now = Math.floor(clock.now() / 1000);
  const prior = readThreadState(state);
  if (!prior) {
    return {
      events: [],
      nextState: { v: 1, kind: "ids", seeded: true, ids: [], cursor: now, floor: now },
    };
  }
  const window = prior.resume ?? {
    after: Math.max(prior.cursor - OVERLAP_SECONDS, prior.floor),
    until: now,
    pageToken: undefined,
  };
  const q = params.q?.trim();
  const query = q ? `${q} after:${window.after}` : `after:${window.after}`;

  const seen = new Set(prior.ids);
  const queued = new Set<string>();
  const unseenNewestFirst: GmailThread[] = [];
  let token: string | undefined = window.pageToken;
  for (let page = 0; page < THREAD_MAX_PAGES; page++) {
    const res = await getManyThreads.execute({
      q: query,
      labelIds: params.labelIds,
      maxResults: PAGE_SIZE,
      pageToken: token,
    }, ctx) as { threads?: GmailThread[]; nextPageToken?: string };
    for (const t of res.threads ?? []) {
      const id = threadEventId(t);
      if (seen.has(id) || queued.has(id)) continue;
      queued.add(id);
      unseenNewestFirst.push(t);
    }
    token = res.nextPageToken;
    if (!token) break;
  }

  const events = unseenNewestFirst.reverse();
  const ids = [...prior.ids, ...events.map(threadEventId)].slice(-THREAD_SEEN_WINDOW);
  const nextState: ThreadState = token
    ? {
      ...prior,
      ids,
      resume: { after: window.after, until: window.until, pageToken: token },
    }
    : { v: 1, kind: "ids", seeded: true, ids, cursor: window.until, floor: prior.floor };
  return { events, nextState };
}

export const newOrUpdatedThreadTrigger: TriggerDefinition<ThreadParams> = {
  key: "new-or-updated-thread",
  title: "New or Updated Thread",
  description:
    "Runs when a conversation gets a new message (or changes) after the trigger was set up. The run gets the thread's id, snippet and history id; fetch the messages with Get Thread.",
  params: NEW_OR_UPDATED_THREAD_PARAMS,
  output: NEW_OR_UPDATED_THREAD_OUTPUT,
  sample: NEW_OR_UPDATED_THREAD_SAMPLE,
  minIntervalMs: 60_000,
  poll({ params, state }, ctx) {
    return checkThreads(params, state, ctx);
  },
};
