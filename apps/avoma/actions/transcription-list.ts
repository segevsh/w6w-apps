import type { ActionDefinition } from "@w6w/types";
import { AvomaClient, csv } from "../lib/client.ts";
import {
  fromDateParam,
  nextParam,
  pageOutput,
  pageSizeParam,
  requireRange,
  toDateParam,
} from "../lib/params.ts";

/**
 * `GET /v1/transcriptions/` — transcripts, either for one meeting or for a date window.
 *
 * With `meeting_uuid` Avoma returns that meeting's transcription directly and ignores
 * `page` / `page_size`; without it the answer is a paginated list and `from_date` /
 * `to_date` are required. Both shapes are folded into the same `results` array.
 */
interface Input {
  meetingUuid?: string;
  fromDate?: string;
  toDate?: string;
  attendeeEmails?: string[] | string;
  crmAccountIds?: string[] | string;
  crmOpportunityIds?: string[] | string;
  crmContactIds?: string[] | string;
  crmLeadIds?: string[] | string;
  page?: number;
  pageSize?: number;
  next?: string;
}

const transcriptionList: ActionDefinition<Input> = {
  key: "transcription-list",
  type: "search",
  resource: "transcription",
  title: "List Transcriptions",
  description: "Fetch the transcript for one meeting, or list transcripts for meetings in a " +
    "date window. Each has speakers and timestamped paragraphs.",
  params: [
    {
      key: "meetingUuid",
      label: "Meeting UUID",
      type: "string",
      hint: "Fetch just this meeting's transcript. Date range and paging are then ignored.",
    },
    fromDateParam(true, "Transcripts for meetings"),
    toDateParam(true, "Transcripts for meetings"),
    { key: "attendeeEmails", label: "Attendee emails", type: "string", hint: "Comma-separated." },
    { key: "crmAccountIds", label: "CRM account IDs", type: "string", hint: "Comma-separated." },
    {
      key: "crmOpportunityIds",
      label: "CRM opportunity IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    { key: "crmContactIds", label: "CRM contact IDs", type: "string", hint: "Comma-separated." },
    { key: "crmLeadIds", label: "CRM lead IDs", type: "string", hint: "Comma-separated." },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { min: 1, integer: true },
      hint: "Page number, when not fetching by meeting.",
    },
    pageSizeParam(),
    nextParam,
  ],
  output: pageOutput,

  execute(input, ctx) {
    if (!input.meetingUuid) requireRange(input);
    return new AvomaClient(ctx).list("/v1/transcriptions/", {
      meeting_uuid: input.meetingUuid,
      from_date: input.fromDate,
      to_date: input.toDate,
      attendee_emails: csv(input.attendeeEmails),
      crm_account_ids: csv(input.crmAccountIds),
      crm_opportunity_ids: csv(input.crmOpportunityIds),
      crm_contact_ids: csv(input.crmContactIds),
      crm_lead_ids: csv(input.crmLeadIds),
      page: input.page,
      page_size: input.pageSize,
    }, input.next);
  },
};

export default transcriptionList;
