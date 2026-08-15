import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId, type PageMeta, toList } from "../lib/client.ts";
import {
  accountIdParam,
  companyIdParam,
  dateRangeParams,
  fieldsParam,
  leadStatusOptions,
  paginationParams,
  sortParams,
  tagsFilterParam,
} from "../lib/params.ts";

/**
 * `GET /v3/a/{account_id}/calls.json` — Listing All Calls.
 *
 * ## Relative pagination is deliberately not exposed
 *
 * The reference recommends relative pagination (`relative_pagination=true` +
 * `offset`) for large result sets on this specific endpoint, because it
 * "provides the endpoint to query the next page of results" rather than a
 * page number. That trade only pays off for a caller that follows
 * `next_page` verbatim across an unbounded number of requests — exactly the
 * shape a single workflow Action invocation is not. This action sticks to
 * Offset Pagination (`page`/`per_page`), which every other list endpoint in
 * this app also uses, so a workflow author learns one pagination model
 * instead of two.
 */
interface Input {
  accountId: string;
  companyId?: string;
  trackerId?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  timeZone?: string;
  callType?: "first_call" | "missed" | "voicemails" | "inbound" | "outbound";
  answerStatus?: "answered" | "missed" | "voicemail";
  device?: "desktop" | "mobile";
  direction?: "inbound" | "outbound";
  leadStatus?: "good_lead" | "not_a_lead" | "not_scored";
  tags?: string;
  search?: string;
  fields?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "search",
  resource: "call",
  title: "List Calls",
  description: "List tracked calls in a CallRail account, with filtering, sorting and searching.",
  params: [
    accountIdParam,
    companyIdParam,
    {
      key: "trackerId",
      label: "Tracker",
      type: "string",
      hint: "Limit to calls made to one specific tracking number's Tracker.",
    },
    ...dateRangeParams(),
    {
      key: "callType",
      label: "Call type",
      type: "select",
      options: [
        { value: "first_call", label: "First call" },
        { value: "missed", label: "Missed" },
        { value: "voicemails", label: "Voicemails" },
        { value: "inbound", label: "Inbound" },
        { value: "outbound", label: "Outbound" },
      ],
    },
    {
      key: "answerStatus",
      label: "Answer status",
      type: "select",
      options: [
        { value: "answered", label: "Answered" },
        { value: "missed", label: "Missed" },
        { value: "voicemail", label: "Voicemail" },
      ],
    },
    {
      key: "device",
      label: "Device",
      type: "select",
      options: [
        { value: "desktop", label: "Desktop" },
        { value: "mobile", label: "Mobile" },
      ],
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "inbound", label: "Inbound" },
        { value: "outbound", label: "Outbound" },
      ],
    },
    { key: "leadStatus", label: "Lead status", type: "select", options: leadStatusOptions },
    tagsFilterParam,
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches business_phone_number, customer_name, customer_number, note, source or " +
        "tracking_phone_number.",
    },
    {
      ...fieldsParam,
      hint: "Comma-separated extra fields, e.g. company_id,company_name,tags,milestones. " +
        "Some sort fields (source, landing_page_url, device_type, first_call, source_name, " +
        "lead_status, tags) are only visible in the response when also requested here.",
    },
    ...sortParams(
      "One of customer_name, customer_phone_number, duration, start_time, source, " +
        "customer_city, customer_country, landing_page_url, device_type, answered, " +
        "first_call, source_name, lead_status, tags.",
    ),
    ...paginationParams(),
  ],
  output: [
    { key: "calls", type: "array", label: "Calls" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Records per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalRecords", type: "number", label: "Total matching calls" },
  ],

  async execute(input, ctx) {
    const body = await new CallRailClient(ctx).json<PageMeta & { calls: unknown[] }>(
      `/a/${encodeId(input.accountId)}/calls.json`,
      {
        query: {
          company_id: input.companyId,
          tracker_id: input.trackerId,
          date_range: input.startDate ? undefined : input.dateRange,
          start_date: input.startDate,
          end_date: input.endDate,
          time_zone: input.timeZone,
          call_type: input.callType,
          answer_status: input.answerStatus,
          device: input.device,
          direction: input.direction,
          lead_status: input.leadStatus,
          tags: toList(input.tags),
          search: input.search,
          fields: input.fields,
          sort: input.sort,
          order: input.order,
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return {
      calls: body.calls,
      page: body.page,
      perPage: body.per_page,
      totalPages: body.total_pages,
      totalRecords: body.total_records,
    };
  },
};

export default callList;
