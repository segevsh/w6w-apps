import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/department-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("department-list: GET /api/v3/departments with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1999, "name": "Ops" }] }]);
  const out = await action.execute({} as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/departments");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, [{ "id": 1999, "name": "Ops" }]);
});
