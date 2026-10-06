import { assertEquals } from "@std/assert";
import action from "../../actions/group-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-get: GET /api/v3/groups/1873 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 1873, "members": [] } }]);
  const out = await action.execute({ "groupId": 1873 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/groups/1873");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 1873, "members": [] });
});
