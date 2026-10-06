import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

type Input = Record<string, never>;

const companyInformationGet: ActionDefinition<Input> = {
  key: "company-information-get",
  type: "read",
  resource: "company",
  title: "Get Company Information",
  description:
    "Fetch the connected company: name, organisation number, address and database number.",
  params: [],
  output: [
    {
      "key": "CompanyInformation",
      "type": "object",
      "label": "Company record (CompanyName, OrganizationNumber, Address, DatabaseNumber, \u2026)",
    },
  ],

  execute(_input, ctx) {
    return new FortnoxClient(ctx).get("/3/companyinformation");
  },
};

export default companyInformationGet;
