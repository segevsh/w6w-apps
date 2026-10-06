import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  companyId: number;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Fetch a company by id.",
  params: [idParam("companyId", "Company ID")],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "website", type: "string", label: "Website" },
  ],

  async execute(input, ctx) {
    const data = await new SalesmateClient(ctx).request<Record<string, unknown>>(
      `/company/v4/${input.companyId}`,
    );
    return data ?? {};
  },
};

export default companyGet;
