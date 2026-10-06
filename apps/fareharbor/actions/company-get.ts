import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Fetch one company by shortname.",
  params: [
    companyParam,
  ],
  output: [
    { key: "company", type: "object", label: "Company" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(`/companies/${seg(input.shortname, "shortname")}/`);
  },
};

export default companyGet;
