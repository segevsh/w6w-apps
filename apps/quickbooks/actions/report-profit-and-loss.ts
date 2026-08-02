import type { ActionDefinition } from "@w6w/types";
import { QuickBooksClient } from "../lib/client.ts";

interface Input {
  startDate?: string;
  endDate?: string;
  accountingMethod?: "Cash" | "Accrual";
  summarizeColumnBy?: string;
}

const reportProfitAndLoss: ActionDefinition<Input> = {
  key: "report-profit-and-loss",
  type: "read",
  resource: "report",
  title: "Profit and Loss Report",
  description: "Run QuickBooks' Profit and Loss report.",
  params: [
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      hint: "YYYY-MM-DD. Defaults to QuickBooks' own report default when omitted.",
    },
    { key: "endDate", label: "End date", type: "date", hint: "YYYY-MM-DD." },
    {
      key: "accountingMethod",
      label: "Accounting method",
      type: "select",
      advanced: true,
      options: [
        { value: "Cash", label: "Cash" },
        { value: "Accrual", label: "Accrual" },
      ],
    },
    {
      key: "summarizeColumnBy",
      label: "Summarize columns by",
      type: "string",
      advanced: true,
      placeholder: "Month",
      hint: "e.g. Total, Month, Quarter, Year, Customers, Vendors.",
    },
  ],
  output: [{ key: "Header", type: "object", label: "Report header" }, {
    key: "Rows",
    type: "object",
    label: "Report rows",
  }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request("/reports/ProfitAndLoss", {
      query: {
        start_date: input.startDate,
        end_date: input.endDate,
        accounting_method: input.accountingMethod,
        summarize_column_by: input.summarizeColumnBy,
      },
    });
  },
};

export default reportProfitAndLoss;
