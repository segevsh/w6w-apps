import type { TriggerDefinition } from "@w6w/types";
import { pollToken } from "../../_shared/poll/mod.ts";
import listEvents from "../actions/list-events.ts";

type Params = { calendarId: string };

interface CalendarEvent {
  id?: string;
  status?: string;
  created?: string;
  updated?: string;
  [key: string]: unknown;
}

interface ListResult {
  items?: CalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

/** Page size of a changes check. Must stay <= `MAX_EVENTS` or `pollToken` throws. */
const PAGE_SIZE = 100;
const MAX_EVENTS = 100;
/** Page size of the seed walk, which emits nothing. */
const SEED_PAGE_SIZE = 250;
/** Upper bound on seed pages, so a runaway calendar fails loudly rather than looping. */
const MAX_SEED_PAGES = 40;

/**
 * The stored token is the plain `nextSyncToken`. When a changes page is followed by another page,
 * it is `{"s": syncToken, "p": pageToken}` so the next check continues that listing.
 */
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

function changeType(event: CalendarEvent): "created" | "updated" | "cancelled" {
  if (event.status === "cancelled") return "cancelled";
  const created = Date.parse(event.created ?? "");
  const updated = Date.parse(event.updated ?? "");
  if (!Number.isNaN(created) && !Number.isNaN(updated) && Math.abs(updated - created) < 2000) {
    return "created";
  }
  return "updated";
}

const eventChanged: TriggerDefinition<Params> = {
  key: "event-changed",
  title: "Event Changed",
  description:
    "Polls a calendar's incremental sync feed. The run gets each event that was created, updated or cancelled since the last check, with a changeType field.",
  params: [
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "string",
      required: true,
      default: "primary",
      hint:
        'Cancelled (deleted) events are emitted with changeType "cancelled". The first check emits nothing.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "changeType", type: "string", label: "created, updated or cancelled" },
    { key: "status", type: "string", label: "Status" },
    { key: "summary", type: "string", label: "Title" },
    { key: "created", type: "string", label: "Created" },
    { key: "updated", type: "string", label: "Updated" },
    { key: "start", type: "object", label: "Start" },
    { key: "end", type: "object", label: "End" },
  ],
  sample: {
    id: "evt123",
    changeType: "updated",
    status: "confirmed",
    summary: "Team sync",
    created: "2026-11-01T09:00:00.000Z",
    updated: "2026-11-09T12:00:00.000Z",
    start: { dateTime: "2026-11-10T10:00:00Z" },
    end: { dateTime: "2026-11-10T10:30:00Z" },
  },
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
      events: events.map((e) => ({ ...e, changeType: changeType(e) })),
      nextState,
    };
  },
};

export default eventChanged;
