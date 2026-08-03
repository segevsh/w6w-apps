import { assertEquals } from "@std/assert";
import action from "../../actions/get-broadcast.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-broadcast: GETs /v4/broadcasts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { broadcast: { id: 9 } } }]);
  await action.execute!({ broadcastId: 9 }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/broadcasts/9");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-broadcast: returns the broadcast envelope", async () => {
  const body = { broadcast: { id: 9, subject: "Hi", content: "<p>Hi</p>" } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({ broadcastId: 9 }, ctx), body);
});
