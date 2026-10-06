import type { ActionDefinition } from "@w6w/types";
import { COMPANY, companyFields, writeOutput, writeRecord } from "../lib/records.ts";

type Input = Record<string, unknown>;

const companyCreate: ActionDefinition<Input> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description:
    "Create a company, or enhance the existing one when an ID or e-mail matches. Cloze returns no record body.",
  idempotent: true,
  params: companyFields(),
  output: writeOutput,

  execute(input, ctx) {
    return writeRecord(ctx, COMPANY, "create", input);
  },
};

export default companyCreate;
