import type { ActionDefinition } from "@w6w/types";
import { asJson, asObject, ClientifyClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/deals/` — Create a deal. `contact` and `company` are Clientify resource URLs (https://api.clientify.net/v1/contacts/<id>/). A pipeline and stage can be named with pipelineDesc / pipelineStageDesc.
 */
interface Input {
  name: string;
  amount?: string;
  contact?: string;
  company?: string;
  pipelineDesc?: string;
  pipelineStageDesc?: string;
  dealSource?: string;
  expectedClosedDate?: string;
  customFields?: unknown;
  extra?: unknown;
}

const dealCreate: ActionDefinition<Input, unknown> = {
  key: "deal-create",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description:
    "Create a deal. `contact` and `company` are Clientify resource URLs (https://api.clientify.net/v1/contacts/<id>/). A pipeline and stage can be named with pipelineDesc / pipelineStageDesc.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "amount",
      label: "Amount",
      type: "string",
      hint: "Decimal as a string or number, e.g. 11.33.",
    },
    {
      key: "contact",
      label: "Contact URL",
      type: "string",
      hint: "https://api.clientify.net/v1/contacts/<id>/",
    },
    {
      key: "company",
      label: "Company URL",
      type: "string",
      hint: "https://api.clientify.net/v1/companies/<id>/",
    },
    { key: "pipelineDesc", label: "Pipeline name", type: "string" },
    { key: "pipelineStageDesc", label: "Pipeline stage name", type: "string" },
    { key: "dealSource", label: "Deal source", type: "string" },
    { key: "expectedClosedDate", label: "Expected close date", type: "date", hint: "YYYY-MM-DD." },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: 'JSON array, e.g. [{"field":"quaderno_id","value":"cdn_1133"}].',
    },
    {
      key: "extra",
      label: "Extra fields",
      type: "json",
      hint:
        "Further body fields as a JSON object (anything the Clientify API accepts that is not listed above, e.g. custom_fields). Named parameters win on a clash.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id" },
    { key: "url", type: "string", label: "Record URL" },
    { key: "name", type: "string", label: "Deal name" },
    { key: "status_desc", type: "string", label: "Deal status" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/deals/`, {
      method: "POST",
      body: compact({
        ...asObject(input.extra, "extra"),
        name: input.name,
        amount: input.amount,
        contact: input.contact,
        company: input.company,
        pipeline_desc: input.pipelineDesc,
        pipeline_stage_desc: input.pipelineStageDesc,
        deal_source: input.dealSource,
        expected_closed_date: input.expectedClosedDate,
        custom_fields: asJson(input.customFields),
      }),
    });
  },
};

export default dealCreate;
