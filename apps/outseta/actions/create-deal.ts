import type { ActionDefinition } from "@w6w/types";
import { buildBody, OutsetaClient } from "../lib/client.ts";

interface Input {
  name: string;
  amount?: number;
  dueDate?: string;
  assignedToPersonUid?: string;
  weight?: number;
  properties?: unknown;
}

/** `POST /api/v1/crm/deals` — Add a new deal to the CRM pipeline. */
const createDeal: ActionDefinition<Input> = {
  key: "create-deal",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description: "Add a new deal to the CRM pipeline.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
    },
    {
      key: "dueDate",
      label: "Due date",
      type: "datetime",
    },
    {
      key: "assignedToPersonUid",
      label: "Assigned to (person Uid)",
      type: "string",
      hint: "Sent as `AssignedToPersonClientIdentifier`, which is the owner's person Uid.",
    },
    {
      key: "weight",
      label: "Weight",
      type: "number",
      validation: {
        integer: true,
      },
    },
    {
      key: "properties",
      label: "Additional properties",
      type: "json",
      advanced: true,
      hint:
        "Extra Outseta properties (including custom ones) as a JSON object, merged into the body exactly as they appear on a GET. The typed fields above win on a clash.",
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/crm/deals`, {
      method: "POST",
      body: buildBody({
        Name: input.name,
        Amount: input.amount,
        DueDate: input.dueDate,
        AssignedToPersonClientIdentifier: input.assignedToPersonUid,
        Weight: input.weight,
      }, input.properties),
    });
  },
};

export default createDeal;
