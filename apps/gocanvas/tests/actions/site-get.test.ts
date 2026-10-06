import { assertEquals } from "@std/assert";
import action from "../../actions/site-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("site-get: GET /api/v3/sites/7 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7 } }]);
  const out = await action.execute({ "siteId": 7 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/sites/7");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 7 });
});
