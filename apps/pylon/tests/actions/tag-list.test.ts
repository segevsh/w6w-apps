import { assertEquals } from "@std/assert";
import action from "../../actions/tag-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tag-list: GETs /tags", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "g1", value: "vip", object_type: "account" }] },
  }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/tags");
  assertEquals(out, {
    tags: [{ id: "g1", value: "vip", object_type: "account" }],
    hasNextPage: false,
  });
});
