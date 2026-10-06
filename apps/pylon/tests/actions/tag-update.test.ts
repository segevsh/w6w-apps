import { assertEquals } from "@std/assert";
import action from "../../actions/tag-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tag-update: PATCHes value and color only", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "g1", value: "gold" } } }]);
  const out = await action.execute!({ id: "g1", value: "gold" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/tags/g1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { value: "gold" });
  assertEquals(out, { id: "g1", value: "gold" });
});
