import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/webhook-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-delete: full input maps to the documented request", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  const out = await action.execute!({ "webhookId": "id_webhookId" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://app.formbricks.com/api/v1/webhooks/id_webhookId",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "data": { "id": "x1" } });
});

Deno.test("webhook-delete: sends x-api-key never itself and no authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  await action.execute!({ "webhookId": "id_webhookId" }, ctx);
  assert(!("x-api-key" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("webhook-delete: surfaces a Formbricks error body as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      code: "bad_request",
      message: "Fields are missing or incorrectly formatted",
      details: {},
    },
  }]);
  await assertRejects(
    async () => await action.execute!({ "webhookId": "id_webhookId" }, ctx),
    Error,
    "Fields are missing or incorrectly formatted",
  );
});
