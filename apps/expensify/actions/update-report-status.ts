import type { ActionDefinition } from "@w6w/types";
import { compact, csv, dateText, runJob } from "../lib/client.ts";

interface Input {
  reportIDList?: string[] | string;
  startDate?: string;
  endDate?: string;
  paymentSource?: string;
}

/** `update` / `reportStatus` — the Report status updater. The only supported status is REIMBURSED. */
const updateReportStatus: ActionDefinition<Input> = {
  key: "update-report-status",
  type: "perform",
  resource: "report",
  title: "Mark Reports Reimbursed",
  description:
    "Mark Approved reports as Reimbursed, selected by report IDs or a date range. Reports in any other status are skipped. A partial result (207) is returned, not thrown, with the skipped and failed reports listed.",
  idempotent: true,
  params: [
    {
      key: "reportIDList",
      label: "Report IDs",
      type: "array",
      item: { type: "string" },
      hint: "Optional if a start date is given.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      placeholder: "2026-01-01",
      hint: "yyyy-mm-dd. Required if no report IDs.",
    },
    { key: "endDate", label: "End date", type: "string", placeholder: "2026-02-01" },
    {
      key: "paymentSource",
      label: "Payment source",
      type: "string",
      validation: { minLength: 1, maxLength: 100 },
      hint: "Optional note on where the payment was made (1–100 characters).",
    },
  ],
  output: [
    { key: "responseCode", type: "number", label: "200 on full success, 207 on partial" },
    { key: "reportIDs", type: "array", label: "Reports updated" },
    { key: "skippedReports", type: "array", label: "Reports in an invalid status, with reasons" },
    { key: "failedReports", type: "array", label: "Reports that failed, with reasons" },
  ],

  async execute(input, ctx) {
    const reportIDList = csv(input.reportIDList);
    const startDate = dateText("startDate", input.startDate);
    if (!reportIDList && !startDate) throw new Error("provide reportIDList or startDate");
    if (input.paymentSource !== undefined && input.paymentSource !== "") {
      const n = input.paymentSource.length;
      if (n < 1 || n > 100) throw new Error("paymentSource must be 1 to 100 characters");
    }
    const res = await runJob(
      ctx,
      {
        type: "update",
        inputSettings: {
          type: "reportStatus",
          status: "REIMBURSED",
          ...compact({ paymentSource: input.paymentSource }),
          filters: compact({
            reportIDList,
            startDate,
            endDate: dateText("endDate", input.endDate),
          }),
        },
      },
      undefined,
      { partialOk: true },
    );
    return {
      responseCode: res.responseCode,
      reportIDs: res.reportIDs ?? [],
      skippedReports: res.skippedReports ?? [],
      failedReports: res.failedReports ?? [],
    };
  },
};

export default updateReportStatus;
