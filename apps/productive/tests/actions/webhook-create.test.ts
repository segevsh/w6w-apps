import { assertEquals, assertRejects } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-create: POST /webhooks sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "42",
        "type": "webhooks",
        "attributes": { "name": "x", "signature_token": "SECRET", "custom_headers": "SECRET" },
      },
    },
  }]);
  const out = await webhookCreate.execute({
    "name": "sample name",
    "targetUrl": "https://example.com/hook",
    "eventId": 7,
    "typeId": 1,
    "customHeaders": '{"X-Key": "v"}',
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "webhooks",
      attributes: {
        "name": "sample name",
        "target_url": "https://example.com/hook",
        "event_id": 7,
        "type_id": 1,
        "custom_headers": { "X-Key": "v" },
      },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
  assertEquals(
    (out as Record<string, unknown>).signature_token,
    undefined,
    "stored secrets are not returned",
  );
  assertEquals(
    (out as Record<string, unknown>).custom_headers,
    undefined,
    "stored secrets are not returned",
  );
});

Deno.test("webhook-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        webhookCreate.execute({
          "name": "sample name",
          "targetUrl": "https://example.com/hook",
          "eventId": 7,
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("webhook-create: declares perform and idempotent=false", () => {
  assertEquals(webhookCreate.type, "perform");
  assertEquals(webhookCreate.idempotent, false);
  assertEquals(webhookCreate.key, "webhook-create");
});
