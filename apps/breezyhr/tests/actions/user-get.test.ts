import { assertEquals } from "@std/assert";
import action from "../../actions/user-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-get: GETs /user and returns the profile as sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "u1", name: "Ann" } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/user");
  assertEquals(calls[0].method, "GET");
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(out, { _id: "u1", name: "Ann" });
});
