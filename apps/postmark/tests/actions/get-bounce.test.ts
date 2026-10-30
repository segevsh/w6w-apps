import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-bounce.ts";

test("get-bounce: GETs /bounces/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ID: 42, Type: "HardBounce" } }]);
  await action.execute({ bounceId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bounces/42");
});

test("get-bounce: throws without a bounceId", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ bounceId: "" }, ctx)),
    Error,
    "bounceId",
  );
});
