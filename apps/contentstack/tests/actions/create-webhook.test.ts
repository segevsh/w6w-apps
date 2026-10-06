import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-webhook.ts";

Deno.test("create-webhook: metadata", () => {
  assertEquals(action.key, "create-webhook");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "name",
    "targetUrl",
    "channels",
    "disabled",
    "concisePayload",
  ]);
});

Deno.test("create-webhook: calls POST /webhooks on the NA host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "The webhook was created successfully.", "webhook": { "uid": "bltw" } },
  }]);
  const out = await action.execute({
    "name": "Hook",
    "targetUrl": "https://example.com/hook",
    "channels": "assets.publish, assets.unpublish",
    "concisePayload": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/webhooks");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "webhook": {
      "name": "Hook",
      "destinations": [{ "target_url": "https://example.com/hook", "authentication_type": "None" }],
      "channels": ["assets.publish", "assets.unpublish"],
      "concise_payload": true,
    },
  });
  assertEquals(out, {
    "notice": "The webhook was created successfully.",
    "webhook": { "uid": "bltw" },
  });
});

Deno.test("create-webhook: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "The webhook was created successfully.", "webhook": { "uid": "bltw" } },
  }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "name": "Hook",
    "targetUrl": "https://example.com/hook",
    "channels": "assets.publish, assets.unpublish",
    "concisePayload": true,
  }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/webhooks");
});

Deno.test("create-webhook: rejects without `name` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({
        "targetUrl": "https://example.com/hook",
        "channels": "assets.publish, assets.unpublish",
        "concisePayload": true,
      }, ctx);
    },
    Error,
    "`name` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-webhook: surfaces Contentstack's own error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      error_message: "Validation failed",
      error_code: 141,
      errors: { title: ["is required"] },
    },
  }]);
  await assertRejects(
    async () => {
      await action.execute({
        "name": "Hook",
        "targetUrl": "https://example.com/hook",
        "channels": "assets.publish, assets.unpublish",
        "concisePayload": true,
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
