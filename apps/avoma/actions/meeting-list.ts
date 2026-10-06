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
 * `GET /v1/meetings/` — meetings started inside a date window.
 *
 * `from_date` and `to_date` are REQUIRED by the spec (the prose says "if none of the query
 * parameters are provided, it gives response for all meetings" — the parameter table says
 * otherwise, and the table is what is followed). `recording_duration__gte` silently excludes
 * meetings that have no recording.
 */
interface Input {
  fromDate?: string;
  toDate?: string;
  attendeeEmails?: string[] | string;
  isCall?: boolean;
  isInternal?: boolean;
  recordingDurationGte?: number;
  crmAccountIds?: string[] | string;
  crmOpportunityIds?: string[] | string;
  crmContactIds?: string[] | string;
  crmLeadIds?: string[] | string;
  includeCrmAssociations?: boolean;
  order?: string;
  pageSize?: number;
  next?: string;
}

const meetingList: ActionDefinition<Input> = {
  key: "meeting-list",
  type: "search",
  resource: "meeting",
  title: "List Meetings",
  description: "List meetings that started inside a date window, with optional attendee, CRM " +
    "and call/video filters.",
  params: [
    fromDateParam(true, "Meetings"),
    toDateParam(true, "Meetings"),
    {
      key: "attendeeEmails",
      label: "Attendee emails",
      type: "string",
      hint: "Comma-separated. Meetings with ANY of these attendees are returned.",
    },
    {
      key: "isCall",
      label: "Voice calls only",
      type: "boolean",
      hint: "On: only voice calls. Off: only video meetings. Leave untouched for both.",
    },
    {
      key: "isInternal",
      label: "Internal only",
      type: "boolean",
      hint: "On: no attendee from outside the organization. Off: at least one external attendee.",
    },
    {
      key: "recordingDurationGte",
      label: "Min recording duration (s)",
      type: "number",
      validation: { min: 0 },
      hint: "Sending this also excludes meetings that have no recording.",
    },
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
      key: "includeCrmAssociations",
      label: "Include CRM associations",
      type: "boolean",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      default: "-start_at",
      options: [
        { value: "-start_at", label: "Newest first (default)" },
        { value: "start_at", label: "Oldest first" },
      ],
    },
    pageSizeParam(),
    nextParam,
  ],
  output: pageOutput,

  execute(input, ctx) {
    requireRange(input);
    return new AvomaClient(ctx).list("/v1/meetings/", {
      from_date: input.fromDate,
      to_date: input.toDate,
      attendee_emails: csv(input.attendeeEmails),
      is_call: input.isCall === undefined ? undefined : String(input.isCall),
      is_internal: input.isInternal === undefined ? undefined : String(input.isInternal),
      recording_duration__gte: input.recordingDurationGte,
      crm_account_ids: csv(input.crmAccountIds),
      crm_opportunity_ids: csv(input.crmOpportunityIds),
      crm_contact_ids: csv(input.crmContactIds),
      crm_lead_ids: csv(input.crmLeadIds),
      include_crm_associations: input.includeCrmAssociations === undefined
        ? undefined
        : String(input.includeCrmAssociations),
      o: input.order,
      page_size: input.pageSize,
    }, input.next);
  },
};

export default meetingList;
