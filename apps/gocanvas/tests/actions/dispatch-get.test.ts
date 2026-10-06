import { assertEquals } from "@std/assert";
import action from "../../actions/dispatch-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("dispatch-get: GET /api/v3/dispatches/194780 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 194780 } }]);
  const out = await action.execute({ "dispatchId": 194780 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/dispatches/194780");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 194780 });
});
