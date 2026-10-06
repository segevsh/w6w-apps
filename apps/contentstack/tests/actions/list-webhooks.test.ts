import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-webhooks.ts";

Deno.test("list-webhooks: metadata", () => {
  assertEquals(action.key, "list-webhooks");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), []);
});

Deno.test("list-webhooks: calls GET /webhooks on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "webhooks": [{ "uid": "bltw" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/webhooks");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "webhooks": [{ "uid": "bltw" }] });
});

Deno.test("list-webhooks: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "webhooks": [{ "uid": "bltw" }] } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/webhooks");
});

Deno.test("list-webhooks: surfaces Contentstack's own error body", async () => {
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
      await action.execute({}, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
