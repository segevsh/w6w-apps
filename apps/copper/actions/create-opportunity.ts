import type { ActionDefinition } from "@w6w/types";
import { compact, CopperClient, CUSTOM_FIELDS_PARAM } from "../lib/client.ts";

interface Input {
  name: string;
  primaryContactId?: number;
  companyId?: number;
  pipelineId?: number;
  pipelineStageId?: number;
  customerSourceId?: number;
  lossReasonId?: number;
  assigneeId?: number;
  monetaryValue?: number;
  closeDate?: string;
  priority?: string;
  status?: string;
  winProbability?: number;
  details?: string;
  tags?: string[] | null;
  customFields?: unknown[] | null;
}

/**
 * `POST /opportunities` — create an Opportunity (a deal).
 *
 * Copper's create page states "The following fields are required for this
 * request: name". The Opportunity properties table separately marks
 * `primary_contact_id` with an asterisk, so the two documents disagree about
 * whether a contact is mandatory. This action follows the endpoint page — only
 * `name` is marked required — and flags `primaryContactId` as strongly
 * recommended in its hint rather than guessing which document is stale. If your
 * account rejects the call, supply a contact.
 *
 * **`close_date` is one of Copper's date-format exceptions.** Copper's best
 * practices page: dates are Unix timestamps "with a few notable exceptions,
 * however. The 'close_date' on Opportunities, Task Due Dates and Reminder dates,
 * and custom date fields use an ISO mm/dd/yyyy format". So this field is a
 * string, not a number, and the hint says so — passing a timestamp here is a
 * silent, plausible mistake.
 *
 * Not idempotent: nothing about an Opportunity is a unique key, so a retry
 * creates a second deal with the same name.
 */
const createOpportunity: ActionDefinition<Input> = {
  key: "create-opportunity",
  type: "perform",
  resource: "opportunity",
  title: "Create Opportunity",
  description:
    "Create an Opportunity. Note `closeDate` is `MM/DD/YYYY` text, not a Unix timestamp — Copper " +
    "makes it one of a handful of documented date-format exceptions.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "primaryContactId",
      label: "Primary contact (Person) ID",
      type: "number",
      hint:
        "Strongly recommended: Copper's Opportunity properties table marks this required even " +
        "though its create-endpoint page lists only `name`.",
    },
    { key: "companyId", label: "Company ID", type: "number" },
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "number",
      hint:
        "Read the ids from the List Pipelines action. Omitted, Copper uses the default pipeline.",
    },
    {
      key: "pipelineStageId",
      label: "Pipeline stage ID",
      type: "number",
      hint: "Must belong to the chosen pipeline. Read the ids from List Pipeline Stages.",
    },
    {
      key: "customerSourceId",
      label: "Customer source ID",
      type: "number",
      hint: "Read the ids from `GET /customer_sources`.",
    },
    {
      key: "lossReasonId",
      label: "Loss reason ID",
      type: "number",
      hint: 'Only meaningful when status is "Lost". Read the ids from `GET /loss_reasons`.',
    },
    { key: "assigneeId", label: "Assignee (User) ID", type: "number" },
    { key: "monetaryValue", label: "Monetary value", type: "number" },
    {
      key: "closeDate",
      label: "Expected close date",
      type: "string",
      placeholder: "12/31/2026",
      hint:
        "`MM/DD/YYYY` (or `DD/MM/YYYY` for accounts set that way) — NOT a Unix timestamp. Copper " +
        "documents close dates, task due/reminder dates and custom date fields as the exceptions " +
        "to its otherwise-universal timestamp format.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "None", label: "None" },
        { value: "Low", label: "Low" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Open", label: "Open" },
        { value: "Won", label: "Won" },
        { value: "Lost", label: "Lost" },
        { value: "Abandoned", label: "Abandoned" },
      ],
      hint: "The Opportunity object carries status as a string; the search filter uses the " +
        "equivalent numeric ids 0–3.",
    },
    {
      key: "winProbability",
      label: "Win probability",
      type: "number",
      hint: "0–100 inclusive.",
      validation: { min: 0, max: 100 },
    },
    { key: "details", label: "Details", type: "text" },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array of strings." },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "number", label: "Opportunity ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new CopperClient(ctx).request("/opportunities", {
      method: "POST",
      body: compact({
        name: input.name,
        primary_contact_id: input.primaryContactId,
        company_id: input.companyId,
        pipeline_id: input.pipelineId,
        pipeline_stage_id: input.pipelineStageId,
        customer_source_id: input.customerSourceId,
        loss_reason_id: input.lossReasonId,
        assignee_id: input.assigneeId,
        monetary_value: input.monetaryValue,
        close_date: input.closeDate,
        priority: input.priority,
        status: input.status,
        win_probability: input.winProbability,
        details: input.details,
        tags: input.tags ?? undefined,
        custom_fields: input.customFields ?? undefined,
      }),
    });
  },
};

export default createOpportunity;
