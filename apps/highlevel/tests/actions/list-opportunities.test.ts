import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/list-opportunities.ts";

Deno.test("list-opportunities: GETs /opportunities/search with location_id (snake_case)", async () => {
  const { ctx, calls } = mockHighLevelCtx([
    { body: { opportunities: [{ id: "o1" }], meta: {} } },
  ], "loc-1");
  await action.execute!({ status: "open", pipelineId: "p1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/opportunities/search");
  assertEquals(url.searchParams.get("location_id"), "loc-1");
  assertEquals(url.searchParams.has("locationId"), false);
  assertEquals(url.searchParams.get("pipeline_id"), "p1");
  assertEquals(url.searchParams.get("status"), "open");
});
