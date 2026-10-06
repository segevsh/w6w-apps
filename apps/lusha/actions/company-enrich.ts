import type { ActionDefinition } from "@w6w/types";
import { compact, LushaClient, strList } from "../lib/client.ts";

interface Input {
  ids: string | string[];
  reveal?: string | string[];
  tableId?: string;
}

const action: ActionDefinition<Input> = {
  key: "company-enrich",
  type: "perform",
  resource: "company",
  title: "Enrich Companies",
  description:
    "Full company data for companies found by Company Search (up to 100 ids), plus optional paid extras (headcount breakdowns, competitors, intent, IT spend, parents).",
  idempotent: false,
  params: [
    {
      key: "ids",
      label: "Company IDs",
      type: "string",
      required: true,
      hint: "Ids from Search Companies.",
    },
    {
      key: "reveal",
      label: "Reveal",
      type: "string",
      hint:
        "e.g. employeesByDepartment, competitors, intent, estimatedAnnualItSpend, monthlyWebsiteTraffic, openJobsTotal, directParent, ultimateParent. Each is charged per result.",
    },
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      hint: "Beta Tables API: also add the results to this table.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request correlation id" },
    { key: "results", type: "array", label: "Enriched companies" },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/companies/enrich`, {
      body: compact({
        ids: strList(input.ids),
        reveal: strList(input.reveal),
        tableId: input.tableId,
      }),
    });
  },
};

export default action;
