import type { ActionDefinition } from "@w6w/types";
import { compact, LushaClient, strList } from "../lib/client.ts";

interface Input {
  ids: string | string[];
  signalTypes: string | string[];
  startDate?: string;
  maxResultsPerSignal?: number;
  tableId?: string;
}

const action: ActionDefinition<Input> = {
  key: "contact-signals",
  type: "read",
  resource: "contact",
  title: "Get Contact Signals",
  description: "Job-change and promotion signal events for up to 100 contacts.",
  params: [
    { key: "ids", label: "Contact IDs", type: "string", required: true, hint: "Up to 100." },
    {
      key: "signalTypes",
      label: "Signal types",
      type: "string",
      required: true,
      hint: "allSignals, promotion, companyChange (see Contact Signal Type List).",
    },
    { key: "startDate", label: "Start date", type: "string", hint: "ISO 8601." },
    { key: "maxResultsPerSignal", label: "Max results per signal", type: "number" },
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      hint: "Beta Tables API: also add the results to this table.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Signals per contact" },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/contacts/signals`, {
      body: compact({
        ids: strList(input.ids),
        signalTypes: strList(input.signalTypes),
        startDate: input.startDate,
        maxResultsPerSignal: input.maxResultsPerSignal,
        tableId: input.tableId,
      }),
    });
  },
};

export default action;
