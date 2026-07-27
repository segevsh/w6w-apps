import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-site.ts";

Deno.test("get-site: GETs /v2/sites/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s1" } }]);
  await action.execute!({ siteId: "s1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/sites/s1");
  assertEquals(calls[0].method, "GET");
});
