import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /companies/{company_id}` — one company. */
interface Input {
  companyId: number;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Fetch one company by id.",
  params: [
    idParam("companyId", "Company ID", "Ids come from a search over `companies`, or from a job."),
  ],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "name", type: "string", label: "Company name" },
    { key: "companyStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "branchName", type: "string", label: "Branch name" },
    { key: "rateCardId", type: "number", label: "Rate card ID" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/companies/${encodeId(input.companyId)}`);
  },
};

export default companyGet;
