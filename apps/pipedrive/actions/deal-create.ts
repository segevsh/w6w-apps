import type { ActionDefinition } from "@w6w/types";
import { compact, PipedriveClient } from "../lib/client.ts";

interface Input {
  title: string;
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
 * POST /deals — create a deal. Only `title` is required; everything else is
 * optional Pipedrive deal metadata.
 */
const dealCreate: ActionDefinition<Input> = {
  key: "deal-create",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description: "Create a new deal.",
  // Pipedrive mints a fresh deal id per call with no client-supplied key, so a
  // retry files a duplicate.
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "value", label: "Value", type: "number", hint: "Monetary amount of the deal." },
    { key: "currency", label: "Currency", type: "string", hint: "3-letter code, e.g. USD." },
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
    { key: "visibleTo", label: "Visible to", type: "string", hint: "Visibility group id." },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "object", label: "Deal" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request("/deals", {
      method: "POST",
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

export default dealCreate;
