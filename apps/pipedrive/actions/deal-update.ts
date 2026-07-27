import type { ActionDefinition } from "@w6w/types";
import { compact, PipedriveClient } from "../lib/client.ts";

interface Input {
  dealId: number;
  title?: string;
  value?: number;
  currency?: string;
  userId?: number;
  personId?: number;
  orgId?: number;
  pipelineId?: number;
  stageId?: number;
  status?: string;
  expectedCloseDate?: string;
  probability?: number;
  visibleTo?: string;
}

/**
 * PUT /deals/{id} — update a deal. Every field but the id is optional; only the
 * supplied ones are changed.
 */
const dealUpdate: ActionDefinition<Input> = {
  key: "deal-update",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description: "Update fields on an existing deal.",
  idempotent: true,
  params: [
    { key: "dealId", label: "Deal ID", type: "number", required: true },
    { key: "title", label: "Title", type: "string" },
    { key: "value", label: "Value", type: "number" },
    { key: "currency", label: "Currency", type: "string" },
    { key: "userId", label: "Owner (user ID)", type: "number" },
    { key: "personId", label: "Person ID", type: "number" },
    { key: "orgId", label: "Organization ID", type: "number" },
    { key: "pipelineId", label: "Pipeline ID", type: "number" },
    { key: "stageId", label: "Stage ID", type: "number" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "won", label: "Won" },
        { value: "lost", label: "Lost" },
        { value: "deleted", label: "Deleted" },
      ],
    },
    { key: "expectedCloseDate", label: "Expected close date", type: "date", hint: "YYYY-MM-DD." },
    { key: "probability", label: "Probability (%)", type: "number" },
    { key: "visibleTo", label: "Visible to", type: "string" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "object", label: "Deal" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request(`/deals/${encodeURIComponent(String(input.dealId))}`, {
      method: "PUT",
      body: compact({
        title: input.title,
        value: input.value,
        currency: input.currency,
        user_id: input.userId,
        person_id: input.personId,
        org_id: input.orgId,
        pipeline_id: input.pipelineId,
        stage_id: input.stageId,
        status: input.status,
        expected_close_date: input.expectedCloseDate,
        probability: input.probability,
        visible_to: input.visibleTo,
      }),
    });
  },
};

export default dealUpdate;
