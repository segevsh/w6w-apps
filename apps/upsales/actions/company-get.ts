import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/accounts/{id}` — Fetch one company by ID. */
interface Input {
  id: number;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Fetch one company by ID.",
  params: [idParam("id", "Company ID")],
  output: [{ key: "data", type: "object", label: "The company" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/accounts/${encodeId(input.id)}`);
    return { data };
  },
};

export default companyGet;
