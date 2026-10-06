import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  dealUid: string;
}

/** `DELETE /api/v1/crm/deals/{dealUid}` — Delete a deal. Irreversible. */
const deleteDeal: ActionDefinition<Input> = {
  key: "delete-deal",
  type: "perform",
  resource: "deal",
  title: "Delete Deal",
  description: "Delete a deal. Irreversible.",
  idempotent: true,
  params: [
    {
      key: "dealUid",
      label: "Deal Uid",
      type: "string",
      hint: "The deal's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
  ],
  output: [
    {
      key: "deleted",
      type: "boolean",
      label: "Deleted",
    },
    {
      key: "uid",
      type: "string",
      label: "Uid of the deleted record",
    },
  ],

  async execute(input, ctx) {
    await OutsetaClient.fromConnection(ctx).request(`/crm/deals/${pathId(input.dealUid)}`, {
      method: "DELETE",
    });
    return { deleted: true, uid: input.dealUid };
  },
};

export default deleteDeal;
