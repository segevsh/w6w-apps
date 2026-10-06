import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";

type Input = Record<string, never>;

const companyList: ActionDefinition<Input> = {
  key: "company-list",
  type: "read",
  resource: "company",
  title: "List Companies",
  description:
    "List every company (supplier) these keys may book through the API, with its shortname, name and currency. Call it routinely: a shortname that disappears should be dropped from later requests.",
  params: [],
  output: [
    { key: "companies", type: "array", label: "Companies (shortname, name, currency)" },
  ],

  execute(_input, ctx) {
    return new FareHarborClient(ctx).get("/companies/");
  },
};

export default companyList;
