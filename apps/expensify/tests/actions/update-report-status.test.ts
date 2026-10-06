import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-report-status.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

Deno.test("update-report-status: posts the reportStatus job with REIMBURSED and returns the IDs", async () => {
  const { ctx, calls } = mockCtx([{
    body: { responseCode: 200, reportIDs: ["R006AseGxMka", "R00bCluvcO4T"] },
  }]);
  const out = await action.execute!({
    reportIDList: ["R006AseGxMka", "R00bCluvcO4T"],
    paymentSource: "ADP",
  }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "update",
    inputSettings: {
      type: "reportStatus",
      status: "REIMBURSED",
      paymentSource: "ADP",
      filters: { reportIDList: "R006AseGxMka,R00bCluvcO4T" },
    },
  });
  assertEquals(out, {
    responseCode: 200,
    reportIDs: ["R006AseGxMka", "R00bCluvcO4T"],
    skippedReports: [],
    failedReports: [],
  });
});

Deno.test("update-report-status: a 207 partial success is returned with skipped and failed reports, not thrown", async () => {
  const body = {
    responseCode: 207,
    reportIDs: ["R00bCluvcO4T"],
    skippedReports: [{ reason: "Report is in status 'Open'", reportID: "R006AseGxMka" }],
    failedReports: [{ reason: "Internal error", reportID: "R002bGmt16ac" }],
  };
  const { ctx } = mockCtx([{ body }]);
  const out = await action.execute!({ startDate: "2026-01-01" }, ctx) as typeof body;
  assertEquals(out.responseCode, 207);
  assertEquals(out.skippedReports[0].reportID, "R006AseGxMka");
  assertEquals(out.failedReports[0].reportID, "R002bGmt16ac");
});

Deno.test("update-report-status: a date range is enough; no paymentSource key when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200, reportIDs: [] } }]);
  await action.execute!({ startDate: "2026-01-01", endDate: "2026-02-01" }, ctx);
  const s = sent(calls[0]).job.inputSettings;
  assertEquals(s.filters, { startDate: "2026-01-01", endDate: "2026-02-01" });
  assert(!("paymentSource" in s));
});

Deno.test("update-report-status: needs a selector, valid dates and a 1-100 char payment source", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "reportIDList or startDate",
  );
  await assertRejects(
    async () => await action.execute!({ startDate: "x" }, ctx),
    Error,
    "yyyy-mm-dd",
  );
  await assertRejects(
    async () =>
      await action.execute!({ reportIDList: ["R1"], paymentSource: "x".repeat(101) }, ctx),
    Error,
    "1 to 100",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-report-status: a 410 (unsupported status) is thrown", async () => {
  const { ctx } = mockCtx([{
    body: { responseMessage: "Status 'APPROVED' is not supported", responseCode: 410 },
  }]);
  await assertRejects(
    async () => await action.execute!({ reportIDList: ["R1"] }, ctx),
    Error,
    "not supported",
  );
});

Deno.test("update-report-status: declares an idempotent perform", () => {
  assertEquals([action.type, action.idempotent], ["perform", true]);
});
