import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  companyId: number;
}

const companyDelete: ActionDefinition<Input> = {
  key: "company-delete",
  type: "perform",
  resource: "company",
  title: "Delete Company",
  description:
    "Delete a company by id. Salesmate reports an unknown id as an ObjectNotFound error.",
  idempotent: false,
  params: [
    idParam("companyId", "Company ID"),
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "number", label: "Company ID" },
  ],

  async execute(input, ctx) {
    await new SalesmateClient(ctx).request(`/company/v4/${input.companyId}`, {
      method: "DELETE",
    });
    return { deleted: true, id: input.companyId };
  },
};

export default companyDelete;
