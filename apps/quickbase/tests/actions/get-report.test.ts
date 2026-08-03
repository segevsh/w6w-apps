import { assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/get-report.ts";

Deno.test("get-report: puts the report in the path and the table in the query", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { id: "1", name: "Open" } }]);
  const out = await action.execute({ tableId: "bck1", reportId: "1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/reports/1");
  assertEquals(url.searchParams.get("tableId"), "bck1");
  assertEquals(out.name, "Open");
});

Deno.test("get-report: is a read, and returns the definition rather than rows", () => {
  assertEquals(action.type, "read");
});
