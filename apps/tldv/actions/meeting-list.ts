import type { ActionDefinition } from "@w6w/types";
import { TldvClient } from "../lib/client.ts";
import { meetingTypeOptions } from "../lib/params.ts";

/**
 * `GET /v1alpha1/meetings` — search meetings by text, date range, type and
 * participation.
 *
 * The vendor's OpenAPI document declares no `parameters` on this path at all —
 * the query shape lives only in the `GetMeetingsQueryParams` schema, unwired
 * to the operation. Every field below is copied from that schema rather than
 * from the (empty) path definition.
 *
 * **Only meetings the API can export are returned.** Programmatic access
 * follows the meeting ORGANIZER's plan (Free-plan organizers get none, even
 * for meetings shared with a Pro/Business teammate), so this list can be
 * legitimately shorter than what tldv.io shows in the UI. See the app README.
 */
interface Input {
  query?: string;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  onlyParticipated?: boolean;
  meetingType?: string;
}

const meetingList: ActionDefinition<Input> = {
  key: "meeting-list",
  type: "search",
  resource: "meeting",
  title: "List Meetings",
  description: "Search meetings by text, date range, participation and type.",
  params: [
    {
      key: "query",
      label: "Search text",
      type: "string",
      hint: "Free-text search over meeting titles.",
    },
    {
      key: "from",
      label: "From",
      type: "date",
      hint: "Only meetings on or after this date.",
    },
    {
      key: "to",
      label: "To",
      type: "date",
      hint: "Only meetings on or before this date.",
    },
    {
      key: "onlyParticipated",
      label: "Only meetings I participated in",
      type: "boolean",
      hint: "Off by default, matching the API.",
    },
    {
      key: "meetingType",
      label: "Meeting type",
      type: "select",
      options: meetingTypeOptions,
      hint: "Leave empty to return both internal and external meetings.",
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 100 },
      hint: "tl;dv's own default is 50, max is 100. The total across all pages cannot exceed " +
        "10,000 — narrow the date range if it does.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "results", type: "array", label: "Meetings" },
    { key: "total", type: "number", label: "Total matching meetings" },
    { key: "page", type: "number", label: "Current page number" },
    { key: "pages", type: "number", label: "Total number of pages" },
    { key: "pageSize", type: "number", label: "Results per page" },
  ],

  execute(input, ctx) {
    return new TldvClient(ctx).get("/meetings", {
      query: {
        query: input.query,
        page: input.page,
        limit: input.limit,
        from: input.from,
        to: input.to,
        // Sent only when true: the docs give `false` as the default, and the
        // vendor never documents how a literal `false` is parsed — the same
        // reasoning this pack applies to every undocumented boolean query
        // param (see apify's `flag()`).
        onlyParticipated: input.onlyParticipated === true ? true : undefined,
        meetingType: input.meetingType,
      },
    });
  },
};

export default meetingList;
