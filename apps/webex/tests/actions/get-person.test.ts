import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-person.ts";

test("get-person: GETs /people/{personId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p2", displayName: "Sam" } }]);
  const result = await action.execute({ personId: "p2" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/people/p2");
  assertEquals(result, { id: "p2", displayName: "Sam" });
});
