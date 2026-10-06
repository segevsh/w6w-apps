import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  dealId: number;
}

const dealDelete: ActionDefinition<Input> = {
  key: "deal-delete",
  type: "perform",
  resource: "deal",
  title: "Delete Deal",
  description: "Delete a deal by id. Salesmate reports an unknown id as an ObjectNotFound error.",
  idempotent: false,
  params: [
    idParam("dealId", "Deal ID"),
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "number", label: "Deal ID" },
  ],

  async execute(input, ctx) {
    await new SalesmateClient(ctx).request(`/deal/v4/${input.dealId}`, {
      method: "DELETE",
    });
    return { deleted: true, id: input.dealId };
  },
};

export default dealDelete;
