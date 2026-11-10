import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot, pollToken } from "../../_shared/poll/mod.ts";
import listCalendars from "../actions/list-calendars.ts";
import listEvents from "../actions/list-events.ts";

/**
 * Google Calendar poll triggers, built on the `list-events` and `list-calendars` actions (the same
 * requests, client and auth).
 *
 * Why polls and not push channels: `events.watch` notifications carry NO body ("they do not contain
 * specific information about updated resources"), the channel expires and must be re-created, and
 * nothing in the trigger lifecycle renews it — see
 * https://developers.google.com/workspace/calendar/api/guides/push (verified 2026-11-10). (The page
 * requires only a valid SSL certificate on the receiving URL, not a verified domain.)
 *
 *   - created / updated / cancelled → the incremental sync feed (`syncToken`), one trigger per kind;
 *   - started / ended → a time window over `timeMin`/`timeMax`, advanced only once drained;
 *   - new calendar → a snapshot of the calendar list.
 */

export type Params = { calendarId: string };
export type ChangeType = "created" | "updated" | "cancelled";

export interface CalendarEvent {
  id?: string;
  status?: string;
  created?: string;
  updated?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  [key: string]: unknown;
}

interface ListResult {
  items?: CalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
  /** The calendar's time zone (IANA name), as Google returns it on every events.list page. */
  timeZone?: string;
}

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export const CALENDAR_PARAM: Param = {
  key: "calendarId",
  label: "Calendar ID",
  type: "string",
  required: true,
  default: "primary",
  hint: 'The calendar to watch. "primary" is your main calendar.',
};

export const EVENT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Event ID" },
  { key: "status", type: "string", label: "Status" },
  { key: "summary", type: "string", label: "Title" },
  { key: "created", type: "string", label: "Created" },
  { key: "updated", type: "string", label: "Updated" },
  { key: "start", type: "object", label: "Start" },
  { key: "end", type: "object", label: "End" },
];

export const EVENT_SAMPLE = {
  id: "evt123",
  status: "confirmed",
  summary: "Team sync",
  created: "2026-11-01T09:00:00.000Z",
  updated: "2026-11-09T12:00:00.000Z",
  start: { dateTime: "2026-11-10T10:00:00Z" },
  end: { dateTime: "2026-11-10T10:30:00Z" },
};

// ---------------------------------------------------------------- sync feed (created/updated/cancelled)

/** Page size of a changes check. Must stay <= `MAX_EVENTS` or `pollToken` throws. */
const PAGE_SIZE = 100;
const MAX_EVENTS = 100;
const SEED_PAGE_SIZE = 250;
const MAX_SEED_PAGES = 40;

/** The stored token is the plain `nextSyncToken`, or `{"s": sync, "p": pageToken}` mid-listing. */
function encode(sync: string, page?: string): string {
  return page ? JSON.stringify({ s: sync, p: page }) : sync;
}

function decode(token: string): { sync: string; page?: string } {
  if (token.startsWith('{"s"')) {
    const parsed = JSON.parse(token) as { s: string; p?: string };
    return { sync: parsed.s, page: parsed.p };
  }
  return { sync: token };
}

function isGone(err: unknown): boolean {
  return err instanceof Error && / 410 /.test(err.message);
}

/**
 * `created` only when the feed item's `updated` is within two seconds of its `created`. A sync-feed
 * item shows the latest state only, so an event created and edited again before the next check (or a
 * guest added to an older event) reads as `updated`: `new-event` can miss it and `event-updated`
 * emits it instead.
 */
export function changeType(event: CalendarEvent): ChangeType {
  if (event.status === "cancelled") return "cancelled";
  const created = Date.parse(event.created ?? "");
  const updated = Date.parse(event.updated ?? "");
  if (!Number.isNaN(created) && !Number.isNaN(updated) && Math.abs(updated - created) < 2000) {
    return "created";
  }
  return "updated";
}

export function syncFeedTrigger(spec: {
  key: string;
  title: string;
  description: string;
  only: ChangeType;
  hint: string;
}): TriggerDefinition<Params> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [{ ...CALENDAR_PARAM, hint: spec.hint }],
    output: [
      ...EVENT_OUTPUT.slice(0, 1),
      { key: "changeType", type: "string", label: "created, updated or cancelled" },
      ...EVENT_OUTPUT.slice(1),
    ],
    sample: { ...EVENT_SAMPLE, changeType: spec.only },
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const calendarId = params.calendarId || "primary";
      const run = (input: Record<string, unknown>) =>
        listEvents.execute({ calendarId, ...input } as never, ctx) as Promise<ListResult>;

      const { events, nextState } = await pollToken<CalendarEvent>({
        state,
        maxEvents: MAX_EVENTS,
        async seed() {
          let pageToken: string | undefined;
          for (let i = 0; i < MAX_SEED_PAGES; i++) {
            const res = await run({ maxResults: SEED_PAGE_SIZE, pageToken });
            if (res.nextSyncToken) return res.nextSyncToken;
            if (!res.nextPageToken) break;
            pageToken = res.nextPageToken;
          }
          throw new Error("Google Calendar full sync did not return a nextSyncToken");
        },
        async changes(token) {
          const { sync, page } = decode(token);
          const res = await run({ syncToken: sync, pageToken: page, maxResults: PAGE_SIZE });
          const nextToken = res.nextPageToken
            ? encode(sync, res.nextPageToken)
            : res.nextSyncToken ?? sync;
          return { items: res.items ?? [], nextToken };
        },
        isExpired: isGone,
      });
      return {
        events: events
          .map((e) => ({ ...e, changeType: changeType(e) }))
          .filter((e) => e.changeType === spec.only),
        nextState,
      };
    },
  };
}

// ---------------------------------------------------------------- time window (started/ended)

const WINDOW_PAGE_SIZE = 100;
const WINDOW_MAX_PAGES = 3;

export interface WindowState {
  v: 1;
  kind: "window";
  seeded: true;
  /** Start of the next window to read (epoch ms, whole seconds). */
  cursor: number;
  /** While a window is being drained: its end, and the page to continue from. */
  until?: number;
  pageToken?: string;
}

/** Offset (ms, local minus UTC) of an IANA zone at an instant; throws on an unknown zone. */
function zoneOffset(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(at));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return local - Math.floor(at / 1000) * 1000;
}

/** Epoch ms of 00:00 on a `YYYY-MM-DD` date in `tz` (UTC when `tz` is missing or unknown). */
export function zonedMidnight(date: string, tz?: string): number {
  const utc = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(utc) || !tz) return utc;
  try {
    const guess = utc - zoneOffset(utc, tz);
    return utc - zoneOffset(guess, tz);
  } catch {
    return utc;
  }
}

/**
 * Event time as epoch ms. An all-day `date` starts at midnight in the CALENDAR's time zone (the
 * `timeZone` of the events.list response), which is the rule Google applies to its own `timeMin`/
 * `timeMax` matching — https://developers.google.com/workspace/calendar/api/concepts/events-calendars
 * ("Matching all-day events to time-bracketed queries"). UTC only when no zone is available.
 */
function moment(t: { dateTime?: string; date?: string } | undefined, tz?: string): number {
  if (t?.dateTime) return Date.parse(t.dateTime);
  return t?.date ? zonedMidnight(t.date, tz) : NaN;
}

const wholeSecond = (ms: number) => Math.floor(ms / 1000) * 1000;
const rfc3339 = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

export function windowTrigger(spec: {
  key: string;
  title: string;
  description: string;
  edge: "start" | "end";
}): TriggerDefinition<Params> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [{
      ...CALENDAR_PARAM,
      hint:
        `The calendar to watch. Fires on the first check after an event's ${spec.edge} time passes; events whose ${spec.edge} passed before the trigger was first checked are not emitted. All-day events count from midnight in the calendar's time zone.`,
    }],
    output: EVENT_OUTPUT,
    sample: EVENT_SAMPLE,
    minIntervalMs: 300_000,
    async poll(
      { params, state },
      ctx,
    ): Promise<{ events: CalendarEvent[]; nextState: WindowState }> {
      const calendarId = params.calendarId || "primary";
      const prior = state as Partial<WindowState> | null;
      if (!prior || prior.seeded !== true || typeof prior.cursor !== "number") {
        return {
          events: [],
          nextState: { v: 1, kind: "window", seeded: true, cursor: wholeSecond(clock.now()) },
        };
      }
      const from = prior.cursor;
      const until = typeof prior.until === "number" ? prior.until : wholeSecond(clock.now());
      if (until <= from) return { events: [], nextState: prior as WindowState };

      // `timeMin` is an exclusive bound on an event's END, `timeMax` an exclusive bound on its START.
      // An event starting in [from, until) has end > from; one ending in [from, until) has start < until.
      const timeMin = spec.edge === "start" ? from : from - 1000;
      let pageToken = prior.pageToken;
      const found: CalendarEvent[] = [];
      let tz: string | undefined;
      for (let i = 0; i < WINDOW_MAX_PAGES; i++) {
        const res = await listEvents.execute({
          calendarId,
          timeMin: rfc3339(timeMin),
          timeMax: rfc3339(until),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: WINDOW_PAGE_SIZE,
          pageToken,
        } as never, ctx) as ListResult;
        tz ??= res.timeZone;
        found.push(...(res.items ?? []));
        pageToken = res.nextPageToken;
        if (!pageToken) break;
      }

      const events = found
        .filter((e) => e.status !== "cancelled")
        .filter((e) => {
          const at = moment(spec.edge === "start" ? e.start : e.end, tz);
          return !Number.isNaN(at) && at >= from && at < until;
        })
        .sort((a, b) =>
          moment(spec.edge === "start" ? a.start : a.end, tz) -
          moment(spec.edge === "start" ? b.start : b.end, tz)
        );
      const nextState: WindowState = pageToken
        ? { v: 1, kind: "window", seeded: true, cursor: from, until, pageToken }
        : { v: 1, kind: "window", seeded: true, cursor: until };
      return { events, nextState };
    },
  };
}

// ---------------------------------------------------------------- new calendar (snapshot)

const CALENDAR_PAGE_SIZE = 250;
/** The calendar list is small by nature; 10 pages × 250 is far past any real account. */
const MAX_CALENDAR_PAGES = 10;

interface CalendarListEntry {
  id: string;
  [key: string]: unknown;
}

export async function checkNewCalendars(state: unknown, ctx: HookContext) {
  const rows: Array<{ key: string; values: CalendarListEntry }> = [];
  let pageToken: string | undefined;
  for (let i = 0; i < MAX_CALENDAR_PAGES; i++) {
    const res = await listCalendars.execute(
      { maxResults: CALENDAR_PAGE_SIZE, pageToken } as never,
      ctx,
    ) as { items?: CalendarListEntry[]; nextPageToken?: string };
    for (const c of res.items ?? []) rows.push({ key: c.id, values: c });
    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }
  if (pageToken) {
    throw new Error(
      `Google Calendar list has more than ${MAX_CALENDAR_PAGES * CALENDAR_PAGE_SIZE} calendars`,
    );
  }
  const { events, nextState } = await pollSnapshot({
    state,
    rows,
    emit: { added: true, updated: false, removed: false },
  });
  return { events: events.map((e) => e.values as CalendarListEntry), nextState };
}
