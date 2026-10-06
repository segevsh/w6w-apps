import type { ActionDefinition } from "@w6w/types";
import { AlegraClient } from "../lib/client.ts";

interface Input {
  fields?: string;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description:
    "Fetch the company profile of the account: name, tax id, regime, country version, decimal precision.",
  params: [
    {
      key: "fields",
      label: "Extra fields",
      type: "string",
      hint: "Comma-separated additional fields to include.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Company name" },
    { key: "applicationVersion", type: "string", label: "Country version" },
  ],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.request("/company", { query: { fields: input.fields } });
  },
};

export default companyGet;
