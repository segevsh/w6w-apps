import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/list-forms.ts";

Deno.test("list-forms: GETs /forms/ scoped to the connection's location", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { forms: [] } }], "loc-1");
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/forms/");
  assertEquals(url.searchParams.get("locationId"), "loc-1");
  assertEquals(url.searchParams.get("limit"), "10");
});
