import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/report-get-many.ts";

Deno.test("report-get-many: GETs /form/{formID}/reports", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([{ id: "r1", list_type: "table", title: "Table Report" }]) },
  ]);
  const result = await action.execute({ formId: "31504059977966" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/form/31504059977966/reports");
  assertEquals(result, { reports: [{ id: "r1", list_type: "table", title: "Table Report" }] });
});

Deno.test("report-get-many: an empty content falls back to an empty list", async () => {
  const { ctx } = mockCtx([{ body: envelope(undefined) }]);
  assertEquals(await action.execute({ formId: "1" }, ctx), { reports: [] });
});
