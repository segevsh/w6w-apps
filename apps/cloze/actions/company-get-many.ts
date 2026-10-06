import type { ActionDefinition } from "@w6w/types";
import { COMPANY, getManyParams, getManyRecords } from "../lib/records.ts";

type Input = Record<string, unknown>;

const companyGetMany: ActionDefinition<Input> = {
  key: "company-get-many",
  type: "read",
  resource: "company",
  title: "Get Multiple Companies",
  description: "Fetch several companies by ID in one call.",
  params: getManyParams(COMPANY),
  output: [
    { key: "items", type: "array", label: "Companies" },
    { key: "count", type: "number", label: "Records returned" },
  ],

  execute(input, ctx) {
    return getManyRecords(ctx, COMPANY, input);
  },
};

export default companyGetMany;
