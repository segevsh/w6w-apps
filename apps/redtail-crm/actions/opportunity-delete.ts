import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";

interface Input {
  opportunityId: number;
}

interface Output {
  deleted: boolean;
}

const opportunityDelete: ActionDefinition<Input, Output> = {
  key: "opportunity-delete",
  type: "perform",
  resource: "opportunity",
  title: "Delete Opportunity",
  description: "Delete a sales opportunity. Redtail answers 204 No Content on success.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new RedtailClient(ctx).request(`/opportunities/${input.opportunityId}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default opportunityDelete;
