import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  csv,
  dateText,
  emailAction,
  opts,
  requiredText,
  runFileJob,
  strArray,
} from "../lib/client.ts";

interface Input {
  template: string;
  fileExtension: string;
  reportIDList?: string[] | string;
  policyIDList?: string[] | string;
  startDate?: string;
  endDate?: string;
  approvedAfter?: string;
  markedAsExported?: string;
  reportState?: string[] | string;
  limit?: number;
  employeeEmail?: string;
  fileBasename?: string;
  includeFullPageReceiptsPdf?: boolean;
  test?: boolean;
  markAsExportedLabel?: string;
  emailRecipients?: string[] | string;
  emailMessage?: string;
}

const EXTENSIONS = ["csv", "xls", "xlsx", "txt", "pdf", "json", "xml"];
const STATES = ["OPEN", "SUBMITTED", "APPROVED", "REIMBURSED", "ARCHIVED"];

/** `file` / `combinedReportData` — the Report Exporter. */
const exportReports: ActionDefinition<Input> = {
  key: "export-reports",
  type: "perform",
  resource: "report",
  title: "Export Reports",
  description:
    "Generate a file of report and expense data from a Freemarker template, selected by report IDs or a date range. Returns the generated file name — pass it to Download File. Optionally marks the reports as exported and emails a link.",
  idempotent: false,
  params: [
    {
      key: "template",
      label: "Export template",
      type: "code",
      required: true,
      hint:
        "Freemarker template that formats the data (see Expensify's export template reference). Sent as the `template` form field.",
    },
    {
      key: "fileExtension",
      label: "File format",
      type: "select",
      required: true,
      default: "csv",
      options: opts(EXTENSIONS),
      hint: "pdf generates one file per report and ignores the template's layout.",
    },
    {
      key: "reportIDList",
      label: "Report IDs",
      type: "array",
      item: { type: "string" },
      hint: "Select reports by ID. One of report IDs, start date or approved-after is required.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      placeholder: "2026-01-01",
      hint:
        "yyyy-mm-dd. Reports submitted or created on/after it. The date range may not exceed one year.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "string",
      placeholder: "2026-02-01",
      hint: "yyyy-mm-dd. Required when the start date or approved-after is over a year old.",
    },
    {
      key: "approvedAfter",
      label: "Approved after",
      type: "string",
      hint: "yyyy-mm-dd. Only reports approved on/after this date (inclusive).",
    },
    {
      key: "policyIDList",
      label: "Policy IDs",
      type: "array",
      item: { type: "string" },
      hint: "Only reports under these policies.",
    },
    {
      key: "reportState",
      label: "Report states",
      type: "multiselect",
      options: opts(STATES),
      hint:
        "OPEN, SUBMITTED, APPROVED, REIMBURSED, ARCHIVED (= Open, Processing, Approved, Reimbursed, Closed on the website).",
    },
    {
      key: "markedAsExported",
      label: "Skip already exported (label)",
      type: "string",
      hint: "Ignore reports already marked exported with this label.",
    },
    { key: "limit", label: "Max reports", type: "number", validation: { min: 1, integer: true } },
    {
      key: "employeeEmail",
      label: "Employee email",
      type: "string",
      hint:
        "Export from this account. Restricted to certain domains; OPEN reports cannot be exported when set.",
    },
    {
      key: "fileBasename",
      label: "File base name",
      type: "string",
      hint: "A random part is appended to make the name globally unique. Default: export.",
    },
    {
      key: "includeFullPageReceiptsPdf",
      label: "Full-page receipts (PDF)",
      type: "boolean",
      hint: "Only used when the format is pdf.",
    },
    {
      key: "markAsExportedLabel",
      label: "Mark as exported (label)",
      type: "string",
      hint: "After the export, mark the reports as exported with this label.",
    },
    {
      key: "emailRecipients",
      label: "Email link to",
      type: "array",
      item: { type: "string" },
      hint: "Email a link to the generated file to these addresses when the export finishes.",
    },
    {
      key: "emailMessage",
      label: "Email message",
      type: "text",
      hint: "Plain text or Freemarker.",
    },
    {
      key: "test",
      label: "Test mode",
      type: "boolean",
      hint: "When true, the finish actions (mark as exported, email) are not executed.",
    },
  ],
  output: [{
    key: "fileName",
    type: "string",
    label: "Generated file name (use with Download File)",
  }],

  async execute(input, ctx) {
    const reportIDList = csv(input.reportIDList);
    const startDate = dateText("startDate", input.startDate);
    const endDate = dateText("endDate", input.endDate);
    const approvedAfter = dateText("approvedAfter", input.approvedAfter);
    if (!reportIDList && !startDate && !approvedAfter) {
      throw new Error("provide reportIDList, startDate or approvedAfter");
    }
    const fileExtension = requiredText("fileExtension", input.fileExtension);
    if (!EXTENSIONS.includes(fileExtension)) {
      throw new Error(`fileExtension must be one of ${EXTENSIONS.join(", ")}`);
    }
    const states = strArray(input.reportState);
    const badState = states.filter((s) => !STATES.includes(s));
    if (badState.length > 0) throw new Error(`unsupported report states: ${badState.join(", ")}`);

    const onFinish = [
      input.markAsExportedLabel
        ? { actionName: "markAsExported", label: input.markAsExportedLabel }
        : undefined,
      emailAction(input.emailRecipients, input.emailMessage),
    ].filter((a) => a !== undefined);

    const fileName = await runFileJob(ctx, {
      type: "file",
      onReceive: { immediateResponse: ["returnRandomFileName"] },
      inputSettings: compact({
        type: "combinedReportData",
        reportState: states.length > 0 ? states.join(",") : undefined,
        limit: input.limit === undefined ? undefined : String(input.limit),
        employeeEmail: input.employeeEmail,
        filters: compact({
          reportIDList,
          policyIDList: csv(input.policyIDList),
          startDate,
          endDate,
          approvedAfter,
          markedAsExported: input.markedAsExported,
        }),
      }),
      outputSettings: compact({
        fileExtension,
        fileBasename: input.fileBasename,
        includeFullPageReceiptsPdf: input.includeFullPageReceiptsPdf,
      }),
      ...(input.test !== undefined ? { test: String(input.test) } : {}),
      ...(onFinish.length > 0 ? { onFinish } : {}),
    }, { template: requiredText("template", input.template) });
    return { fileName };
  },
};

export default exportReports;
