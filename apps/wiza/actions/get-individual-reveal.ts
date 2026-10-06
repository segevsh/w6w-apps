import type { ActionDefinition } from "@w6w/types";
import { dataOf, WizaClient } from "../lib/client.ts";

interface Input {
  id: string | number;
}

const getIndividualReveal: ActionDefinition<Input> = {
  key: "get-individual-reveal",
  type: "read",
  resource: "individual-reveal",
  title: "Get Individual Reveal",
  description:
    'Read an individual reveal by id (GET /api/individual_reveals/{id}). Poll until `is_complete` is true; `status` is queued, resolving, finished or failed. A billing problem is NOT an HTTP error: the call is a 200 and the record is `failed` with `fail_error: "billing_issue"`.',
  params: [
    {
      key: "id",
      label: "Reveal ID",
      type: "string",
      required: true,
      hint: "The `id` returned by Start Individual Reveal.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Reveal ID" },
    { key: "status", type: "string", label: "queued | resolving | finished | failed" },
    { key: "is_complete", type: "boolean", label: "True once finished or failed" },
    { key: "fail_error", type: "string", label: "Failure reason when failed, e.g. billing_issue" },
    { key: "name", type: "string", label: "Full name" },
    { key: "title", type: "string", label: "Job title" },
    { key: "company", type: "string", label: "Company name" },
    { key: "email", type: "string", label: "Best email" },
    { key: "email_status", type: "string", label: "valid | risky | unfound" },
    { key: "emails", type: "array", label: "All emails with type and status" },
    { key: "mobile_phone", type: "string", label: "Mobile phone" },
    { key: "phones", type: "array", label: "All phones" },
    { key: "credits", type: "object", label: "Credits charged for this reveal" },
  ],

  async execute(input, ctx) {
    const id = String(input.id ?? "").trim();
    if (!/^\d+$/.test(id)) throw new Error("id must be the numeric reveal id");
    const body = await new WizaClient(ctx).call(`/api/individual_reveals/${id}`);
    return dataOf(body);
  },
};

export default getIndividualReveal;
