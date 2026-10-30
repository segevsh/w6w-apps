import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-memberships.ts";

test("list-memberships: GETs /memberships with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "mb1" }] } }]);
  const result = await action.execute({ roomId: "r1" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/memberships?roomId=r1");
  assertEquals(result, [{ id: "mb1" }]);
});
