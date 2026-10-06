import type { ActionDefinition } from "@w6w/types";
import { COMPANY, deleteParams, deleteRecord } from "../lib/records.ts";

type Input = Record<string, unknown>;

const companyDelete: ActionDefinition<Input> = {
  key: "company-delete",
  type: "perform",
  resource: "company",
  title: "Delete Company",
  description: "Delete a company. This cannot be undone.",
  idempotent: true,
  params: deleteParams(COMPANY),
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "ID deleted" },
  ],

  execute(input, ctx) {
    return deleteRecord(ctx, COMPANY, input);
  },
};

export default companyDelete;
