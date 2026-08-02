import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/get-location.ts";

Deno.test("get-location: defaults to the connection's own locationId", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { location: { id: "loc-1" } } }], "loc-1");
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/locations/loc-1");
});

Deno.test("get-location: an explicit locationId overrides the connection's", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { location: { id: "loc-2" } } }], "loc-1");
  await action.execute!({ locationId: "loc-2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/locations/loc-2");
});
