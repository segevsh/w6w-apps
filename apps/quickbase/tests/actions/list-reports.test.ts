import { assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/list-reports.ts";

Deno.test("list-reports: GETs /reports with tableId as a query param", async () => {
  const { ctx, calls } = mockQbCtx([{ body: [] }]);
  await action.execute({ tableId: "bck1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/reports");
  assertEquals(url.searchParams.get("tableId"), "bck1");
});

Deno.test("list-reports: a report's filter lives at query.filter, not `where`", async () => {
  const { ctx } = mockQbCtx([{
    body: [{
      id: "1",
      name: "Open",
      type: "table",
      query: { tableId: "bck1", filter: "{6.EX.'x'}" },
    }],
  }]);
  const out = await action.execute({ tableId: "bck1" }, ctx);
  assertEquals(out[0].query!.filter, "{6.EX.'x'}");
});
