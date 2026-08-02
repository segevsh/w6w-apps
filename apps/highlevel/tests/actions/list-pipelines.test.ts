import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/list-pipelines.ts";

Deno.test("list-pipelines: GETs /opportunities/pipelines scoped to the location", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { pipelines: [] } }], "loc-1");
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/opportunities/pipelines");
  assertEquals(url.searchParams.get("locationId"), "loc-1");
});
