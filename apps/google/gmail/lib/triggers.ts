import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import getManyMessages from "../actions/get-many-messages.ts";
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
