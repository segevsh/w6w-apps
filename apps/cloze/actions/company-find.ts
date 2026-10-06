import type { ActionDefinition } from "@w6w/types";
import { COMPANY, findParams, findRecords } from "../lib/records.ts";

type Input = Record<string, unknown>;

const companyFind: ActionDefinition<Input> = {
  key: "company-find",
  type: "search",
  resource: "company",
  title: "Find Companies",
  description:
    "Search your companies with Cloze's query syntax or structured filters, one page at a time.",
  params: [...findParams(COMPANY)],
  output: [
    { key: "items", type: "array", label: "Companies" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "availableCount", type: "number", label: "Total matching" },
    { key: "pageNumber", type: "number", label: "Page number" },
    { key: "pageSize", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return findRecords(ctx, COMPANY, input);
  },
};

export default companyFind;
