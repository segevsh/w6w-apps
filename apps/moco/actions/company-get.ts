import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";

interface Input {
  companyId: number;
}

/** `GET /companies/{id}` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. */
const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Fetch a single company (customer, supplier or organization) by ID.",
  params: [
    { key: "companyId", label: "Company ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request(`/companies/${input.companyId}`);
  },
};

export default companyGet;
