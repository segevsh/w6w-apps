import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-list.ts";

Deno.test("webhook-list: reads the plural path and returns the bare array", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ subscribeId: 1234, teamId: 99, listId: 2, callbackUrl: "https://example.com/h" }],
  }]);
  const result = await action.execute!({}, ctx) as Array<{ subscribeId: number }>;

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/webhooks");
  assertEquals(result.length, 1);
  assertEquals(result[0].subscribeId, 1234);
});

Deno.test("webhook-list: declares no params", () => {
  assertEquals(action.params, []);
});
