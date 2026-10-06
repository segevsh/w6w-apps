import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-list.ts";

Deno.test("webhook-list: wraps the bare array SignWell returns", async () => {
  const hooks = [{ id: "h1", callback_url: "https://x.test/hook", api_application_id: null }];
  const { ctx, calls } = mockCtx([{ body: hooks }]);
  assertEquals(await action.execute!({}, ctx), { webhooks: hooks, count: 1 });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/hooks");
  assertEquals(calls[0].method, "GET");
});

Deno.test("webhook-list: an empty list is count 0", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await action.execute!({}, ctx), { webhooks: [], count: 0 });
});
