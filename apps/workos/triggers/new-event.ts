import { walkTrigger } from "../lib/walk.ts";
import eventList from "../actions/event-list.ts";

const PAGE = 100;
type Ev = { id?: unknown; created_at?: unknown };
const lastId = (got: unknown[]): string | undefined => {
  const id = (got[got.length - 1] as Ev | undefined)?.id;
  return id === undefined || id === null || id === "" ? undefined : String(id);
};

/**
 * `GET /events` is OLDEST first and pages forward with `after` (the last event id), per
 * https://workos.com/docs/reference/events ("Events are returned oldest first; use `after` to
 * page forward"). So the trigger keeps the last event id it read as a resume position and asks
 * for everything `after` it; the very first read starts at `range_start` = the seed instant.
 */
export default walkTrigger<{ events?: string }>({
  key: "new-event",
  title: "New Event",
  description: "The run gets each new WorkOS event of the chosen types.",
  action: eventList as never,
  params: [{ key: "events", label: "Event Types", type: "string", required: true }],
  first: ({ floor, mark, params }) =>
    mark
      ? { events: params.events, after: String(mark), maxPages: 1 }
      : { events: params.events, rangeStart: new Date(floor).toISOString(), maxPages: 1 },
  next: (req, _result, got) => {
    const after = got.length >= PAGE ? lastId(got) : undefined;
    return after ? { ...req, after, rangeStart: undefined } : undefined;
  },
  items: (r) => (r as { events?: unknown[] }).events ?? [],
  idOf: (i) => String((i as Ev).id ?? ""),
  stampOf: (i) => {
    const t = Date.parse(String((i as Ev).created_at ?? ""));
    return Number.isNaN(t) ? undefined : t;
  },
  markOf: (prev, read) => lastId(read) ?? prev,
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "event", type: "string", label: "Event type" },
    { key: "data", type: "object", label: "Event payload" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "event_01EHZNVPK3SFK441A1RGBFSHRT",
    event: "dsync.user.created",
    data: { id: "directory_user_01E1X1B89NH8Z3SDFJR4H7RGX7" },
    created_at: "2026-11-09T10:00:00.000Z",
  },
});
