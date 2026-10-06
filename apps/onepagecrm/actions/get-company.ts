import type { ActionDefinition } from "@w6w/types";
import { encodeId, OnePageClient } from "../lib/client.ts";

interface Input {
  companyId: string;
}

/** `GET /companies/{company_id}` — one company with its contacts, pending deals and roll-ups. */
const getCompany: ActionDefinition<Input> = {
  key: "get-company",
  type: "read",
  resource: "company",
  title: "Get Company",
  description:
    "Fetch one company with its contact count, won/pending deal totals and pending deals.",
  params: [{ key: "companyId", label: "Company ID", type: "string", required: true }],
  output: [{ key: "company", type: "object", label: "The company" }],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data(`/companies/${encodeId(input.companyId)}`);
  },
};

export default getCompany;
