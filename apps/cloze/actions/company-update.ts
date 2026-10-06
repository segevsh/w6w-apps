import type { ActionDefinition } from "@w6w/types";
import { COMPANY, companyFields, writeOutput, writeRecord } from "../lib/records.ts";

type Input = Record<string, unknown>;

const companyUpdate: ActionDefinition<Input> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description:
    "Update an existing company (matched by Cloze ID, unique ID or e-mail); only the fields you set change. Cloze returns no record body.",
  idempotent: true,
  params: companyFields(),
  output: writeOutput,

  execute(input, ctx) {
    return writeRecord(ctx, COMPANY, "update", input);
  },
};

export default companyUpdate;
