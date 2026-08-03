import type { ActionDefinition } from "@w6w/types";
import { compact, CopperClient, CUSTOM_FIELDS_PARAM } from "../lib/client.ts";

interface Input {
  opportunityId: number | string;
  name?: string;
  primaryContactId?: number | null;
  companyId?: number | null;
  pipelineId?: number | null;
  pipelineStageId?: number | null;
  customerSourceId?: number | null;
  lossReasonId?: number | null;
  assigneeId?: number | null;
  monetaryValue?: number | null;
  closeDate?: string | null;
  priority?: string;
  status?: string;
  winProbability?: number | null;
  details?: string | null;
  tags?: string[] | null;
  customFields?: unknown[] | null;
}

/**
 * `PUT /opportunities/{id}` — update an Opportunity, including moving it to a
 * new pipeline stage or closing it out.
 *
 * PATCH-like, as everywhere in Copper: only fields present in the body change,
 * and an explicit `null` clears one.
 *
 * Two things worth stating because they interact:
 *
 *   - Setting `status` to `"Lost"` is the point at which `lossReasonId` becomes
 *     meaningful. Copper describes the loss reason as applying "If the
 *     Opportunity's status is 'Lost'".
 *   - Moving stages means setting `pipelineStageId` to a stage that belongs to
 *     the Opportunity's pipeline. Copper records the move as a `system` Activity
 *     of type "Pipeline Stage Changed" (hard-coded id 3), which is why that
 *     activity type appears in reads but cannot be created.
 *
 * `closeDate` is `MM/DD/YYYY` text, not a Unix timestamp — the same documented
 * exception as on create.
 *
 * Idempotent: applying the same body twice leaves the same record.
 */
const updateOpportunity: ActionDefinition<Input> = {
  key: "update-opportunity",
  type: "perform",
  resource: "opportunity",
  title: "Update Opportunity",
  description:
    "Update an Opportunity — advance its pipeline stage, change its value, or close it Won/Lost. " +
    "Only the fields you supply change; `closeDate` is `MM/DD/YYYY` text, not a timestamp.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "primaryContactId", label: "Primary contact (Person) ID", type: "number" },
    { key: "companyId", label: "Company ID", type: "number" },
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "number",
      hint: "Read the ids from the List Pipelines action.",
    },
    {
      key: "pipelineStageId",
      label: "Pipeline stage ID",
      type: "number",
      hint:
        "Must belong to this Opportunity's pipeline. Copper logs the move as a system Activity " +
        '("Pipeline Stage Changed").',
    },
    { key: "customerSourceId", label: "Customer source ID", type: "number" },
    {
      key: "lossReasonId",
      label: "Loss reason ID",
      type: "number",
      hint: 'Applies when status is "Lost". Read the ids from `GET /loss_reasons`.',
    },
    { key: "assigneeId", label: "Assignee (User) ID", type: "number" },
    { key: "monetaryValue", label: "Monetary value", type: "number" },
    {
      key: "closeDate",
      label: "Expected close date",
      type: "string",
      placeholder: "12/31/2026",
      hint: "`MM/DD/YYYY` text, NOT a Unix timestamp.",
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
    },
    {
      key: "winProbability",
      label: "Win probability",
      type: "number",
      hint: "0–100 inclusive.",
      validation: { min: 0, max: 100 },
    },
    { key: "details", label: "Details", type: "text" },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array of strings. Replaces the list." },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "number", label: "Opportunity ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new CopperClient(ctx).request(
      `/opportunities/${encodeURIComponent(String(input.opportunityId))}`,
      {
        method: "PUT",
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
          tags: input.tags,
          custom_fields: input.customFields,
        }),
      },
    );
  },
};

export default updateOpportunity;
