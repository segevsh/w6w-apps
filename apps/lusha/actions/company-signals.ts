import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LushaClient, strList } from "../lib/client.ts";

interface Input {
  ids: string | string[];
  signalTypes: string | string[];
  startDate?: string;
  maxResultsPerSignal?: number;
  filters?: unknown;
  tableId?: string;
}

const action: ActionDefinition<Input> = {
  key: "company-signals",
  type: "read",
  resource: "company",
  title: "Get Company Signals",
  description:
    "Hiring, headcount, web-traffic, IT-spend and LinkedIn-intent signal events for up to 100 companies.",
  params: [
    { key: "ids", label: "Company IDs", type: "string", required: true, hint: "Up to 100." },
    {
      key: "signalTypes",
      label: "Signal types",
      type: "string",
      required: true,
      hint: "allSignals, surgeInHiring, itSpendIncrease, ... (see Company Signal Type List).",
    },
    { key: "startDate", label: "Start date", type: "string", hint: "ISO 8601." },
    { key: "maxResultsPerSignal", label: "Max results per signal", type: "number" },
    {
      key: "filters",
      label: "Filters",
      type: "json",
      hint: "Optional signal filters (see Lusha docs).",
    },
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      hint: "Beta Tables API: also add the results to this table.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Signals per company" },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/companies/signals`, {
      body: compact({
        ids: strList(input.ids),
        signalTypes: strList(input.signalTypes),
        startDate: input.startDate,
        maxResultsPerSignal: input.maxResultsPerSignal,
        filters: jsonValue(input.filters),
        tableId: input.tableId,
      }),
    });
  },
};

export default action;
