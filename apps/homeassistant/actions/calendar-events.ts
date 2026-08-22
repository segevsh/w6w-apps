import type { ActionDefinition } from "@w6w/types";
import { entityId, HomeAssistantClient, query } from "../lib/client.ts";

/**
 * `GET /api/calendars/<entity_id>?start=&end=` — events in a window.
 *
 * ## Both bounds are required, and there is no paging
 *
 * The window *is* the query. Ask for a year and you get a year in one response;
 * there is no cursor and no limit parameter.
 *
 * ## All-day events have a different shape, and it catches everyone
 *
 * A timed event has `start.dateTime` — an ISO timestamp with an offset. An
 * all-day event has `start.date` — a bare `YYYY-MM-DD`, no time, no zone. The
 * two never both appear, so `event.start.dateTime` is `undefined` for every
 * all-day event and code that sorts or compares on it silently drops them.
 *
 * This action normalises both into a `start`/`end` string and flags `allDay`,
 * while leaving the original objects intact.
 *
 * Note also that an all-day event's `end.date` is **exclusive** — a single-day
 * event on the 5th ends on the 6th. Treating it as inclusive makes every
 * all-day event look a day longer than it is.
 */
const action: ActionDefinition = {
  key: "calendar-events",
  type: "read",
  resource: "calendar",
  title: "Get calendar events",
  description:
    "Events in a time window. All-day events use `start.date` and timed ones `start.dateTime` — " +
    "never both — so this normalises them and flags which is which.",
  params: [
    {
      key: "entityId",
      label: "Calendar",
      type: "string",
      required: true,
      default: "",
      placeholder: "calendar.family",
      hint: "From `calendar-list`.",
    },
    {
      key: "start",
      label: "From",
      type: "string",
      required: true,
      default: "",
      hint: "ISO 8601. Required — the window is the whole query, and there is no paging.",
    },
    {
      key: "end",
      label: "To",
      type: "string",
      required: true,
      default: "",
      hint: "ISO 8601.",
    },
  ],
  output: [
    { key: "events", type: "array", label: "Events, each with normalised start/end and allDay" },
    { key: "count", type: "number", label: "How many" },
    { key: "allDayCount", type: "number", label: "How many are all-day" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entity = entityId(p.entityId, "entityId");
    const start = String(p.start ?? "").trim();
    const end = String(p.end ?? "").trim();
    if (!start || !end) throw new Error("`start` and `end` are both required");

    const result = await new HomeAssistantClient(ctx).request<
      Array<{
        summary?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>
    >(`/calendars/${encodeURIComponent(entity)}`, { query: query({ start, end }) });

    const raw = Array.isArray(result) ? result : [];
    const events = raw.map((event) => {
      // Exactly one of the two is present, never both.
      const allDay = Boolean(event?.start?.date && !event?.start?.dateTime);
      return {
        ...event,
        allDay,
        start: event?.start?.dateTime ?? event?.start?.date,
        end: event?.end?.dateTime ?? event?.end?.date,
        // Kept, because the normalised strings lose the distinction.
        rawStart: event?.start,
        rawEnd: event?.end,
      };
    });

    ctx.log("info", "read Home Assistant calendar events", {
      count: events.length,
      allDay: events.filter((e) => e.allDay).length,
    });

    return {
      events,
      count: events.length,
      allDayCount: events.filter((e) => e.allDay).length,
    };
  },
};

export default action;
