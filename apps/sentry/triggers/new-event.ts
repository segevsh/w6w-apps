import eventList from "../actions/event-list.ts";
import { ORG_PARAM, PROJECT_PARAM } from "../lib/params.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/**
 * `GET /api/0/projects/{org}/{project}/events/` documents `start` / `end` (ISO 8601) and Link-header
 * cursor paging, and no sort order (https://docs.sentry.io/api/events/list-a-projects-error-events/,
 * verified 2026-11-10). Each check runs `event-list` with `returnAll` over the window from the last
 * check (minus a two-minute overlap) to now: the action follows the cursor itself, so a window is
 * always drained inside one check. Events stamped before the first check are never emitted.
 */
export default sinceTrigger({
  key: "new-event",
  title: "New Event",
  description: "The run gets each error event newly received by one Sentry project.",
  action: eventList,
  pageSize: 10_000,
  params: [ORG_PARAM, { ...PROJECT_PARAM, hint: "The project whose events to watch." }],
  input: ({ since, until }, params) => ({
    organizationSlug: params.organizationSlug,
    projectSlug: params.projectSlug,
    start: since,
    end: until,
    returnAll: true,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { eventID?: unknown }).eventID ?? ""),
  stampOf: (item) => (item as { dateCreated?: unknown }).dateCreated,
  output: [
    { key: "eventID", type: "string", label: "Event ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "message", type: "string", label: "Message" },
    { key: "groupID", type: "string", label: "Issue ID" },
    { key: "dateCreated", type: "string", label: "Created at" },
  ],
  sample: {
    eventID: "9fac2ceed9344f2bbfdd1fdacb0ed9b1",
    title: "TypeError: x is undefined",
    message: "x is undefined",
    groupID: "1234",
    dateCreated: "2026-11-10T09:00:00Z",
  },
});
