import { assertEquals } from "@std/assert";
import action from "../../actions/template-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("template-get: GET /snippets/t1?fields=title%2Csource", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "t1", title: "Hi" } }]);
  const out = await action.execute!({ templateId: "t1", fields: "title,source" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/snippets/t1?fields=title%2Csource");
  assertEquals(calls[0].body, null);
  assertEquals(out, { template: { _id: "t1", title: "Hi" } });
});
