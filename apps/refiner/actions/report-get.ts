import type { ActionDefinition } from "@w6w/types";
import { asObject, compact, type QueryValue, RefinerClient, toList } from "../lib/client.ts";

interface Input {
  type: string;
  formUuids?: string[] | string;
  segmentUuids?: string[] | string;
  tagUuids?: string[] | string;
  questionIdentifiers?: string[] | string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  responseData?: unknown;
  contactData?: unknown;
  accountData?: unknown;
}

const reportGet: ActionDefinition<Input> = {
  key: "report-get",
  type: "read",
  resource: "report",
  title: "Get Report",
  description:
    "Aggregated survey results like the Reporting dashboards: NPS, CSAT, rating average, value " +
    "distribution, or view/response counts. Defaults to the last seven days.",
  params: [
    {
      key: "type",
      label: "Report type",
      type: "select",
      required: true,
      default: "nps",
      options: [
        { value: "nps", label: "NPS (score plus detractors/passives/promoters)" },
        { value: "csat", label: "CSAT (score plus distribution)" },
        { value: "ratings", label: "Ratings (average plus distribution)" },
        { value: "distribution", label: "Distribution of all values" },
        { value: "count", label: "View and response counts" },
      ],
    },
    {
      key: "formUuids",
      label: "Survey UUIDs",
      type: "string",
      hint: "Comma-separated. Empty means all surveys.",
    },
    { key: "segmentUuids", label: "Segment UUIDs", type: "string", hint: "Comma-separated." },
    { key: "tagUuids", label: "Tag UUIDs", type: "string", hint: "Comma-separated." },
    {
      key: "questionIdentifiers",
      label: "Question identifiers",
      type: "string",
      hint: "Comma-separated. Empty means every question that matches the report type.",
    },
    {
      key: "dateRangeStart",
      label: "From",
      type: "string",
      hint: "ISO 8601. Default: 7 days ago.",
    },
    {
      key: "dateRangeEnd",
      label: "Until",
      type: "string",
      hint: "ISO 8601. Default: end of today.",
    },
    {
      key: "responseData",
      label: "Filter by answers",
      type: "json",
      hint: 'e.g. {"nps": 9}',
    },
    { key: "contactData", label: "Filter by contact traits", type: "json" },
    { key: "accountData", label: "Filter by account traits", type: "json" },
  ],
  output: [
    { key: "data", type: "object", label: "Report breakdown (shape depends on the type)" },
    { key: "count", type: "number", label: "Data points (nps, csat, ratings)" },
    { key: "nps", type: "number", label: "NPS score (type nps)" },
    { key: "csat", type: "number", label: "CSAT score (type csat)" },
    { key: "average", type: "number", label: "Average (type ratings)" },
    { key: "views", type: "number", label: "Survey views (type count)" },
    { key: "responses", type: "number", label: "Responses (types count, distribution)" },
    { key: "date_range_start", type: "string", label: "Effective range start" },
    { key: "date_range_end", type: "string", label: "Effective range end" },
  ],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/reporting", {
      query: {
        ...compact({
          type: input.type,
          date_range_start: input.dateRangeStart,
          date_range_end: input.dateRangeEnd,
        }) as Record<string, QueryValue>,
        form_uuids: toList(input.formUuids),
        segment_uuids: toList(input.segmentUuids),
        tag_uuids: toList(input.tagUuids),
        question_identifiers: toList(input.questionIdentifiers),
        response_data: asObject(input.responseData, "responseData") as QueryValue,
        contact_data: asObject(input.contactData, "contactData") as QueryValue,
        account_data: asObject(input.accountData, "accountData") as QueryValue,
      },
    });
  },
};

export default reportGet;
