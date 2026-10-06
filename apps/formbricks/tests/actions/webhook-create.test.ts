import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/webhook-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-create: full input maps to the documented request", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  const out = await action.execute!({
    "url": "sample-url",
    "triggers": ["a1", "b2"],
    "name": "sample-name",
    "surveyIds": ["a1", "b2"],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.formbricks.com/api/v1/webhooks");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "url": "sample-url",
    "triggers": ["a1", "b2"],
    "name": "sample-name",
    "surveyIds": ["a1", "b2"],
  });
  assertEquals(out, { "data": { "id": "x1" } });
});

Deno.test("webhook-create: required input only maps to the documented request", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  const out = await action.execute!({ "url": "sample-url", "triggers": ["a1", "b2"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.formbricks.com/api/v1/webhooks");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), { "url": "sample-url", "triggers": ["a1", "b2"] });
  assertEquals(out, { "data": { "id": "x1" } });
});

Deno.test("webhook-create: sends x-api-key never itself and no authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  await action.execute!({ "url": "sample-url", "triggers": ["a1", "b2"] }, ctx);
  assert(!("x-api-key" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("webhook-create: surfaces a Formbricks error body as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      code: "bad_request",
      message: "Fields are missing or incorrectly formatted",
      details: {},
    },
  }]);
  await assertRejects(
    async () => await action.execute!({ "url": "sample-url", "triggers": ["a1", "b2"] }, ctx),
    Error,
    "Fields are missing or incorrectly formatted",
  );
});
