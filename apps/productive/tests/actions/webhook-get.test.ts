import { assertEquals, assertRejects } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-get: GET /webhooks/{id} flattens the resource", async () => {
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
  const out = await webhookGet.execute({ id: "42", include: "project" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks/42");
  assertEquals(queryOf(calls[0].url), { include: "project" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(out.id, "42");
  assertEquals(out.type, "webhooks");
  assertEquals(out.name, "x");
  assertEquals(out.signature_token, undefined, "stored secrets are not returned");
  assertEquals(out.custom_headers, undefined, "stored secrets are not returned");
});

Deno.test("webhook-get: an id cannot change the path", async () => {
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
  await webhookGet.execute({ id: "4/../x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname.startsWith("/api/v2/webhooks/"), true);
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks/4%2F..%2Fx");
});

Deno.test("webhook-get: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(webhookGet.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("webhook-get: declares read", () => {
  assertEquals(webhookGet.type, "read");
  assertEquals(webhookGet.idempotent, undefined);
  assertEquals(webhookGet.key, "webhook-get");
});
