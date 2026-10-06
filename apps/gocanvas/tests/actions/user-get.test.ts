import { assertEquals } from "@std/assert";
import action from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: GET /api/v3/users/20122 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 20122 } }]);
  const out = await action.execute({ "userId": 20122 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/users/20122");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 20122 });
});
