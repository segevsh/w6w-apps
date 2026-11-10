import calendarList from "../actions/calendar-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/** `GET /api/v2/calendars/` takes `created_at__gte`; pages follow the `next` cursor. */
export default sinceTrigger({
  key: "new-calendar",
  title: "New Calendar",
  description: "The run gets each newly connected calendar.",
  action: calendarList,
  pageSize: 100,
  input: ({ since }) => ({ createdAtGte: since }),
  items: (result) => (result as { calendars?: unknown[] }).calendars ?? [],
  nextPageInput: (input, result) => {
    const cursor = (result as { nextCursor?: string }).nextCursor;
    return cursor ? { ...input, cursor } : undefined;
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) => (item as { created_at?: unknown }).created_at,
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "platform", type: "string", label: "Platform" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "cal_1",
    platform: "google_calendar",
    status: "connected",
    created_at: "2026-11-10T09:00:00Z",
  },
});
