import type { ActionDefinition } from "@w6w/types";
import { BreezyClient } from "../lib/client.ts";

/** `GET /companies` — the companies the token's user belongs to (a bare array, unpaged). */
const companyList: ActionDefinition<Record<string, never>> = {
  key: "company-list",
  type: "search",
  resource: "company",
  title: "List Companies",
  description:
    "List the companies the token's user belongs to. Every other action needs a company `_id` from here.",
  params: [],
  output: [{ key: "companies", type: "array", label: "Companies" }],

  async execute(_input, ctx) {
    return { companies: await new BreezyClient(ctx).array("/companies") };
  },
};

export default companyList;
