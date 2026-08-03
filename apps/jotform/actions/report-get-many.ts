import type { ActionDefinition } from "@w6w/types";
import { JotformClient } from "../lib/client.ts";

interface Input {
  formId: string;
}

/**
 * GET /form/{formID}/reports — the shareable views built over a form's data
 * (Excel, CSV, grid, table, calendar, RSS, visual), each with its public URL.
 */
const reportGetMany: ActionDefinition<Input> = {
  key: "report-get-many",
  type: "read",
  resource: "report",
  title: "Get Many Reports",
  description: "List a form's reports — Excel, CSV, grid, table, calendar, RSS or visual.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "The digits in a form's URL. Get IDs from Get Many Forms.",
    },
  ],
  output: [
    { key: "reports", type: "array", label: "Reports" },
  ],

  async execute(input, ctx) {
    const reports = await new JotformClient(ctx).content<unknown[]>(
      `/form/${encodeURIComponent(input.formId)}/reports`,
    );
    return { reports: reports ?? [] };
  },
};

export default reportGetMany;
