import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/export-reports.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

const TEMPLATE = "<#list reports as report>${report.reportName}</#list>";
const TEXT = { "content-type": "text/plain" };

Deno.test("export-reports: by report IDs, posts file/combinedReportData with the template as its own field", async () => {
  const { ctx, calls } = mockCtx([{ body: "export_8c1d.csv", headers: TEXT }]);
  const out = await action.execute!({
    template: TEMPLATE,
    fileExtension: "csv",
    reportIDList: ["R00bCluvcO4T", "R006AseGxMka"],
  }, ctx);
  assertWire(calls[0]);
  const { job, extra } = sent(calls[0]);
  assertEquals(job, {
    type: "file",
    onReceive: { immediateResponse: ["returnRandomFileName"] },
    inputSettings: {
      type: "combinedReportData",
      filters: { reportIDList: "R00bCluvcO4T,R006AseGxMka" },
    },
    outputSettings: { fileExtension: "csv" },
  });
  assertEquals(extra, { template: TEMPLATE });
  assertEquals(out, { fileName: "export_8c1d.csv" });
});

Deno.test("export-reports: a date-range export with finish actions matches the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: "myExport_1.xlsx", headers: TEXT }]);
  await action.execute!({
    template: TEMPLATE,
    fileExtension: "xlsx",
    startDate: "2016-01-01",
    endDate: "2016-02-01",
    reportState: ["APPROVED", "REIMBURSED"],
    limit: 10,
    markedAsExported: "Expensify Export",
    fileBasename: "myExport",
    markAsExportedLabel: "Expensify Export",
    emailRecipients: "manager@domain.com,finances@domain.com",
    emailMessage: "Report is ready.",
    test: true,
  }, ctx);
  assertEquals(sent(calls[0]).job, {
    type: "file",
    onReceive: { immediateResponse: ["returnRandomFileName"] },
    inputSettings: {
      type: "combinedReportData",
      reportState: "APPROVED,REIMBURSED",
      limit: "10",
      filters: {
        startDate: "2016-01-01",
        endDate: "2016-02-01",
        markedAsExported: "Expensify Export",
      },
    },
    outputSettings: { fileExtension: "xlsx", fileBasename: "myExport" },
    test: "true",
    onFinish: [
      { actionName: "markAsExported", label: "Expensify Export" },
      {
        actionName: "email",
        recipients: "manager@domain.com,finances@domain.com",
        message: "Report is ready.",
      },
    ],
  });
});

Deno.test("export-reports: needs a report selector, a valid format, valid states and a template", async () => {
  const { ctx, calls } = mockCtx([]);
  const base = { template: TEMPLATE, fileExtension: "csv" };
  await assertRejects(
    async () => await action.execute!({ ...base }, ctx),
    Error,
    "reportIDList, startDate or approvedAfter",
  );
  await assertRejects(
    async () => await action.execute!({ ...base, startDate: "2026-1-1" }, ctx),
    Error,
    "yyyy-mm-dd",
  );
  await assertRejects(
    async () =>
      await action.execute!({ ...base, fileExtension: "docx", startDate: "2026-01-01" }, ctx),
    Error,
    "fileExtension must be one of",
  );
  await assertRejects(
    async () =>
      await action.execute!({ ...base, startDate: "2026-01-01", reportState: ["DONE"] }, ctx),
    Error,
    "unsupported report states: DONE",
  );
  await assertRejects(
    async () => await action.execute!({ ...base, template: " ", startDate: "2026-01-01" }, ctx),
    Error,
    "template is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("export-reports: approvedAfter alone is a valid selector", async () => {
  const { ctx, calls } = mockCtx([{ body: "export_x.json", headers: TEXT }]);
  await action.execute!(
    { template: TEMPLATE, fileExtension: "json", approvedAfter: "2026-02-01" },
    ctx,
  );
  assertEquals(sent(calls[0]).job.inputSettings.filters, { approvedAfter: "2026-02-01" });
});

Deno.test("export-reports: surfaces an error envelope instead of treating it as a file name", async () => {
  const { ctx } = mockCtx([{
    body: { responseMessage: "Date range exceeds one year", responseCode: 410 },
  }]);
  await assertRejects(
    async () =>
      await action.execute!(
        { template: TEMPLATE, fileExtension: "csv", startDate: "2020-01-01" },
        ctx,
      ),
    Error,
    "Date range exceeds one year",
  );
});

Deno.test("export-reports: declares a non-idempotent perform", () => {
  assertEquals([action.type, action.idempotent], ["perform", false]);
  assert(action.params!.find((p) => p.key === "template")!.required);
});
