import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-team.ts";

test("create-team: POSTs /teams", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute({ name: "Engineering" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://webexapis.com/v1/teams");
  assertEquals(JSON.parse(calls[0].body!), { name: "Engineering" });
});

test("create-team: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
