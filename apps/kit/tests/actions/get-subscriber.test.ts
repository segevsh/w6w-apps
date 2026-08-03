import { assertEquals } from "@std/assert";
import action from "../../actions/get-subscriber.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-subscriber: GETs /v4/subscribers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriber: { id: 357 } } }]);
  await action.execute!({ subscriberId: 357 }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/subscribers/357");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-subscriber: returns the subscriber envelope", async () => {
  const body = { subscriber: { id: 357, email_address: "ada@example.com", state: "active" } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({ subscriberId: 357 }, ctx), body);
});
