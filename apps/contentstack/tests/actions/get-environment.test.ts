import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-environment.ts";

Deno.test("get-environment: metadata", () => {
  assertEquals(action.key, "get-environment");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["environmentName"]);
});

Deno.test("get-environment: calls GET /environments/production on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "environment": { "name": "production" } } }]);
  const out = await action.execute({ "environmentName": "production" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/environments/production");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "environment": { "name": "production" } });
});

Deno.test("get-environment: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "environment": { "name": "production" } } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "environmentName": "production" }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/environments/production");
});

Deno.test("get-environment: rejects without `environmentName` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`environmentName` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-environment: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "environmentName": "production" }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
