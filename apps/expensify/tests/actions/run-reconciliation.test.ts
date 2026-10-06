import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/run-reconciliation.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

const TEMPLATE = "<#list cards as card, reports></#list>";
const INPUT = {
  template: TEMPLATE,
  startDate: "2016-01-01",
  endDate: "2016-10-10",
  domain: "example.com",
  type: "Unreported" as const,
};

Deno.test("run-reconciliation: posts the documented synchronous job and returns the file name", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      filename: "is_reconciliation_5429137734434770049.csv",
      responseMessage: "OK",
      responseCode: 200,
    },
  }]);
  const out = await action.execute!({
    ...INPUT,
    feed: "export_all_feeds",
    fileExtension: "csv",
    emailRecipients: ["a@b.c"],
  }, ctx);
  assertWire(calls[0]);
  const { job, extra } = sent(calls[0]);
  assertEquals(job, {
    type: "reconciliation",
    inputSettings: {
      startDate: "2016-01-01",
      endDate: "2016-10-10",
      domain: "example.com",
      feed: "export_all_feeds",
      type: "Unreported",
      async: false,
    },
    outputSettings: { fileExtension: "csv" },
    onFinish: [{ actionName: "email", recipients: "a@b.c" }],
  });
  assertEquals(extra, { template: TEMPLATE });
  assertEquals(out, { fileName: "is_reconciliation_5429137734434770049.csv" });
});

Deno.test("run-reconciliation: never sends async:true (only synchronous runs are supported)", async () => {
  const { ctx, calls } = mockCtx([{ body: { filename: "f.csv", responseCode: 200 } }]);
  await action.execute!(INPUT, ctx);
  assertEquals(sent(calls[0]).job.inputSettings.async, false);
  assertEquals(sent(calls[0]).job.outputSettings, {});
});

Deno.test("run-reconciliation: validates type, dates, format and template locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ ...INPUT, type: "Some" as never }, ctx),
    Error,
    "Unreported or All",
  );
  await assertRejects(
    async () => await action.execute!({ ...INPUT, startDate: "01/01/2016" }, ctx),
    Error,
    "yyyy-mm-dd",
  );
  await assertRejects(
    async () => await action.execute!({ ...INPUT, endDate: "" }, ctx),
    Error,
    "endDate is required",
  );
  await assertRejects(
    async () => await action.execute!({ ...INPUT, fileExtension: "xlsx" }, ctx),
    Error,
    "fileExtension must be one of",
  );
  await assertRejects(
    async () => await action.execute!({ ...INPUT, template: "" }, ctx),
    Error,
    "template is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("run-reconciliation: surfaces the vendor's write error", async () => {
  const { ctx } = mockCtx([{
    body: {
      responseMessage: "Error encountered while trying to write reconcilation report to file.",
      responseCode: 500,
    },
  }]);
  await assertRejects(
    async () => await action.execute!(INPUT, ctx),
    Error,
    "write reconcilation report",
  );
});

Deno.test("run-reconciliation: declares a non-idempotent perform", () => {
  assertEquals([action.type, action.idempotent], ["perform", false]);
});
