import { assertEquals } from "@std/assert";
import action from "../../actions/template-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("template-list: GET /snippets?search=intro&isInline=false", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ _id: "t1" }] } }]);
  const out = await action.execute!({ search: "intro", isInline: false } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/snippets?search=intro&isInline=false");
  assertEquals(calls[0].body, null);
  assertEquals(out, { results: [{ _id: "t1" }] });
});
