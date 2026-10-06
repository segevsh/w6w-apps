import type { ActionDefinition } from "@w6w/types";
import {
  asObject,
  compact,
  CURSOR_PARAM,
  PAGE_PARAMS,
  type QueryValue,
  RefinerClient,
  toList,
} from "../lib/client.ts";

interface Input {
  formUuid?: string;
  formUuids?: string[] | string;
  segmentUuid?: string;
  tagUuid?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  include?: string;
  search?: string;
  responseData?: unknown;
  contactData?: unknown;
  accountData?: unknown;
  withAttributes?: boolean;
  page?: number;
  pageLength?: number;
  pageCursor?: string;
}

function filterObject(value: unknown, label: string): QueryValue {
  return asObject(value, label) as QueryValue;
}

const responseList: ActionDefinition<Input> = {
  key: "response-list",
  type: "search",
  resource: "response",
  title: "List Responses",
  description:
    "List survey responses newest first, with the answers (`data`), the survey and the contact " +
    "who answered. Filter by survey, segment, tag, date range, answers or traits. For more " +
    "than ~10,000 rows, page with the cursor from `pagination.next_page_cursor`.",
  params: [
    { key: "formUuid", label: "Survey UUID", type: "string" },
    {
      key: "formUuids",
      label: "Survey UUIDs",
      type: "string",
      hint: "Comma-separated, to cover several surveys at once.",
    },
    { key: "segmentUuid", label: "Segment UUID", type: "string" },
    { key: "tagUuid", label: "Tag UUID", type: "string" },
    {
      key: "dateRangeStart",
      label: "From",
      type: "string",
      hint: "ISO 8601 (`2026-01-01` or `2026-01-01 10:00:00`). Compared with the response's " +
        "last-data-reception time, or last-shown time when Include is `all`.",
    },
    { key: "dateRangeEnd", label: "Until", type: "string", hint: "ISO 8601, exclusive." },
    {
      key: "include",
      label: "Include",
      type: "select",
      default: "completed",
      options: [
        { value: "completed", label: "Completed responses" },
        { value: "partials", label: "Partial and completed" },
        { value: "all", label: "All, including dismissed views" },
      ],
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches the contact's user id, Refiner UUID, email or name.",
    },
    {
      key: "responseData",
      label: "Filter by answers",
      type: "json",
      hint: 'Object of question identifier to value, e.g. {"nps": 9}. All keys must match.',
    },
    {
      key: "contactData",
      label: "Filter by contact traits",
      type: "json",
      hint: 'e.g. {"country": "France"}. All keys must match.',
    },
    {
      key: "accountData",
      label: "Filter by account traits",
      type: "json",
      hint: 'e.g. {"plan": "pro"}. All keys must match.',
    },
    {
      key: "withAttributes",
      label: "Include contact attributes",
      type: "boolean",
      hint: "Adds every attribute on record to each contact object. Larger payload.",
    },
    ...PAGE_PARAMS,
    CURSOR_PARAM,
  ],
  output: [
    { key: "items", type: "array", label: "Responses" },
    { key: "pagination", type: "object", label: "Pagination block" },
  ],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/responses", {
      query: {
        ...compact({
          form_uuid: input.formUuid,
          segment_uuid: input.segmentUuid,
          tag_uuid: input.tagUuid,
          date_range_start: input.dateRangeStart,
          date_range_end: input.dateRangeEnd,
          include: input.include,
          search: input.search,
          with_attributes: input.withAttributes ? 1 : undefined,
          page: input.page,
          page_length: input.pageLength,
          page_cursor: input.pageCursor,
        }) as Record<string, QueryValue>,
        form_uuids: toList(input.formUuids),
        response_data: filterObject(input.responseData, "responseData"),
        contact_data: filterObject(input.contactData, "contactData"),
        account_data: filterObject(input.accountData, "accountData"),
      },
    });
  },
};

export default responseList;
