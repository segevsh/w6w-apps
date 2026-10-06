import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/report-get.ts";

Deno.test("report-get: GETs a report by id", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ id: "r1", name: "Invoice" }) }]);
  const out = await action.execute({ reportId: "r1" }, ctx);
  assertEquals(out.report, { id: "r1", name: "Invoice" });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/reports/r1`);
});

Deno.test("report-get: a 404 is an error", async () => {
  const { ctx } = connCtx([{ status: 404, body: errorBody("Report not found") }]);
  await assertRejects(
    async () => await action.execute({ reportId: "x" }, ctx),
    Error,
    "Report not found",
  );
});
