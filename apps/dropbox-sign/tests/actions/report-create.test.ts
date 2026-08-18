import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/report-create.ts";

/** MM/DD/YYYY, not ISO — an ISO date is a plausible string that means nothing here. */
Deno.test("report-create: an ISO date is refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({
        startDate: "2026-01-31",
        endDate: "02/28/2026",
        reportType: ["document_status"],
      }, ctx),
    Error,
    "`startDate` must be MM/DD/YYYY",
  );
  assertEquals(calls.length, 0);
});

Deno.test("report-create: posts the dates and types as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: "queued" } }]);
  await action.execute!({
    startDate: "01/31/2026",
    endDate: "02/28/2026",
    reportType: ["document_status", "user_activity"],
  }, ctx);
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/report/create");
  assertEquals(JSON.parse(calls[0].body!), {
    start_date: "01/31/2026",
    end_date: "02/28/2026",
    report_type: ["document_status", "user_activity"],
  });
});

Deno.test("report-create: at most two report types", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({
        startDate: "01/31/2026",
        endDate: "02/28/2026",
        reportType: ["document_status", "user_activity", "sms_activity"],
      }, ctx),
    Error,
    "at most two types",
  );
  assertEquals(calls.length, 0);
});

/** The report arrives by email; nothing comes back on the wire. */
Deno.test("report-create: the output says the result arrives by email", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs[0].label.includes("email"), outputs[0].label);
  assert(action.description!.includes("emails it"), action.description);
});
