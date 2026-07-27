import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-get-many.ts";

Deno.test("tag-get-many: GETs /tags and returns the response verbatim", async () => {
  const body = { type: "list", data: [{ id: "1", name: "vip" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/tags");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
