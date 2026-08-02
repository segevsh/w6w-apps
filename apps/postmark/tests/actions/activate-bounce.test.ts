import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activate-bounce.ts";

Deno.test("activate-bounce: PUTs /bounces/{id}/activate", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { Message: "OK", Bounce: { ID: 42, Inactive: false } },
  }]);
  await action.execute({ bounceId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bounces/42/activate");
  assertEquals(calls[0].method, "PUT");
});

Deno.test("activate-bounce: throws without a bounceId", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ bounceId: "" }, ctx)),
    Error,
    "bounceId",
  );
});

Deno.test("activate-bounce: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
