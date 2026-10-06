import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-branches.ts";

Deno.test("list-branches: metadata", () => {
  assertEquals(action.key, "list-branches");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["includeCount", "limit", "skip"]);
});

Deno.test("list-branches: calls GET /stacks/branches on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "branches": [{ "uid": "main" }] } }]);
  const out = await action.execute({ "includeCount": true }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/stacks/branches?include_count=true");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "branches": [{ "uid": "main" }] });
});

Deno.test("list-branches: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "branches": [{ "uid": "main" }] } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "includeCount": true }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/stacks/branches?include_count=true",
  );
});

Deno.test("list-branches: surfaces Contentstack's own error body", async () => {
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
