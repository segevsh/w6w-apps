import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-environments.ts";

Deno.test("list-environments: metadata", () => {
  assertEquals(action.key, "list-environments");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["includeCount", "asc", "desc"]);
});

Deno.test("list-environments: calls GET /environments on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "environments": [{ "name": "production" }] } }]);
  const out = await action.execute({ "includeCount": true }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/environments?include_count=true");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "environments": [{ "name": "production" }] });
});

Deno.test("list-environments: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "environments": [{ "name": "production" }] } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "includeCount": true }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/environments?include_count=true",
  );
});

Deno.test("list-environments: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "includeCount": true }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
