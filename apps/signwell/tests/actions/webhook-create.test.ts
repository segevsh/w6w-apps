import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-create.ts";

test("webhook-create: POSTs callback_url (and api_application_id when given)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "h1", callback_url: "https://x.test/hook" },
  }]);
  const out = await action.execute!({
    callback_url: "https://x.test/hook",
    api_application_id: "app1",
  }, ctx);
  assertEquals(out, { id: "h1", callback_url: "https://x.test/hook" });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/hooks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    callback_url: "https://x.test/hook",
    api_application_id: "app1",
  });
  assertEquals(action.idempotent, false);
});

test("webhook-create: callback_url is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`callback_url`");
  assertEquals(calls.length, 0);
});
