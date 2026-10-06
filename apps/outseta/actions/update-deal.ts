import type { ActionDefinition } from "@w6w/types";
import { buildBody, OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  dealUid: string;
  name?: string;
  amount?: number;
  dueDate?: string;
  assignedToPersonUid?: string;
  weight?: number;
  properties?: unknown;
}

/** `PUT /api/v1/crm/deals/{dealUid}` — Update properties on a deal. Only the properties you send change. */
const updateDeal: ActionDefinition<Input> = {
  key: "update-deal",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description: "Update properties on a deal. Only the properties you send change.",
  idempotent: true,
  params: [
    {
      key: "dealUid",
      label: "Deal Uid",
      type: "string",
      hint: "The deal's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
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
    return OutsetaClient.fromConnection(ctx).request(`/crm/deals/${pathId(input.dealUid)}`, {
      method: "PUT",
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

export default updateDeal;
