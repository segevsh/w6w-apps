import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
}

/** `GET /company/{id}` — 403 unless the company's plan includes the Developer API. */
const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description:
    "Read a company's profile (name, friendly id, member count). Needs a plan with the Developer API.",
  params: [companyIdParam],
  output: [
    { key: "_id", type: "string", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "friendly_id", type: "string", label: "Friendly ID" },
    { key: "member_count", type: "number", label: "Members" },
  ],

  execute(input, ctx) {
    return new BreezyClient(ctx).request("GET", company(input.companyId));
  },
};

export default companyGet;
