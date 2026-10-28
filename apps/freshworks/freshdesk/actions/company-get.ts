import type { ActionDefinition } from "@w6w/types";
import { FreshdeskClient } from "../lib/client.ts";

interface Input {
  companyId: number;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Fetch a single company by ID.",
  params: [
    { key: "companyId", label: "Company ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new FreshdeskClient(ctx).request(`/companies/${input.companyId}`);
  },
};

export default companyGet;
