import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userNumberList from "../../actions/user-number-list.ts";
import { listBody, mockCtx, pathOf } from "../_helpers.ts";

/**
 * This endpoint exists only because the v2 User object dropped the `numbers`
 * array, so it must be on v2 — the v1 path does not exist.
 */
test("user-number-list: reads GET /v2/users/{id}/numbers", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("numbers", [{ id: 1234 }]) }]);
  const out = await userNumberList.execute({ userId: "456" }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/users/456/numbers");
  assertEquals(out.items.length, 1);
});
