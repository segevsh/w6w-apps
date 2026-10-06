import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/accounts/{id}` — Delete a company. Upsales answers `{"error": null}`. */
interface Input {
  id: number;
}

const companyDelete: ActionDefinition<Input> = {
  key: "company-delete",
  type: "perform",
  resource: "company",
  title: "Delete Company",
  description: "Delete a company.",
  idempotent: true,
  params: [idParam("id", "Company ID")],
  output: [
    { key: "deleted", type: "boolean", label: "True when Upsales accepted the delete" },
    { key: "id", type: "number", label: "The deleted record's ID" },
  ],

  async execute(input, ctx) {
    await new UpsalesClient(ctx).data("DELETE", `/accounts/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default companyDelete;
