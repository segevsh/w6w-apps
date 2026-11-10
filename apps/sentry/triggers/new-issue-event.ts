import issueEventList from "../actions/issue-event-list.ts";
import { ORG_PARAM } from "../lib/params.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/**
 * `GET /api/0/organizations/{org}/issues/{issue_id}/events/` documents `start` / `end` and
 * Link-header cursor paging (https://docs.sentry.io/api/events/list-an-issues-events/, verified
 * 2026-11-10). Same window and drain as `new-event`, for the events of one issue.
 */
export default sinceTrigger({
  key: "new-issue-event",
  title: "New Issue Event",
  description: "The run gets each event newly grouped under one Sentry issue.",
  action: issueEventList,
  pageSize: 10_000,
  params: [
    ORG_PARAM,
    {
      key: "issueId",
      label: "Issue ID",
      type: "string",
      required: true,
      placeholder: "1234",
      hint: "The issue whose events to watch.",
    },
  ],
  input: ({ since, until }, params) => ({
    organizationSlug: params.organizationSlug,
    issueId: params.issueId,
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
