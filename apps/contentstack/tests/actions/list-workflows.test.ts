import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-workflows.ts";

Deno.test("list-workflows: metadata", () => {
  assertEquals(action.key, "list-workflows");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), []);
});

Deno.test("list-workflows: calls GET /workflows on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "workflows": [{ "uid": "bltf" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/workflows");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "workflows": [{ "uid": "bltf" }] });
});

Deno.test("list-workflows: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "workflows": [{ "uid": "bltf" }] } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/workflows");
});

Deno.test("list-workflows: surfaces Contentstack's own error body", async () => {
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
