import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient } from "../lib/client.ts";

interface Input {
  pipelineId: string;
  name: string;
  contactId: string;
  status?: string;
  pipelineStageId?: string;
  monetaryValue?: number;
  assignedTo?: string;
}

const createOpportunity: ActionDefinition<Input> = {
  key: "create-opportunity",
  type: "perform",
  resource: "opportunity",
  title: "Create Opportunity",
  description: "Create a new opportunity on a pipeline, attached to a contact.",
  idempotent: false,
  params: [
    { key: "pipelineId", label: "Pipeline ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "open",
      options: [
        { value: "open", label: "Open" },
        { value: "won", label: "Won" },
        { value: "lost", label: "Lost" },
        { value: "abandoned", label: "Abandoned" },
      ],
    },
    { key: "pipelineStageId", label: "Pipeline stage ID", type: "string" },
    { key: "monetaryValue", label: "Monetary value", type: "number" },
    { key: "assignedTo", label: "Assigned user ID", type: "string" },
  ],
  output: [{ key: "opportunity", type: "object", label: "Created opportunity" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/opportunities/", {
      method: "POST",
      body: {
        locationId: client.locationId,
        pipelineId: input.pipelineId,
        name: input.name,
        contactId: input.contactId,
        status: input.status ?? "open",
        pipelineStageId: input.pipelineStageId,
        monetaryValue: input.monetaryValue,
        assignedTo: input.assignedTo,
      },
    });
  },
};

export default createOpportunity;
