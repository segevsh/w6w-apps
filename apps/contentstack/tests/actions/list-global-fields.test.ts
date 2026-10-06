import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-global-fields.ts";

Deno.test("list-global-fields: metadata", () => {
  assertEquals(action.key, "list-global-fields");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "includeCount",
    "includeGlobalFieldSchema",
    "branch",
  ]);
});

Deno.test("list-global-fields: calls GET /global_fields on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "global_fields": [{ "uid": "seo" }] } }]);
  const out = await action.execute({ "includeCount": true }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/global_fields?include_count=true");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "global_fields": [{ "uid": "seo" }] });
});

Deno.test("list-global-fields: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "global_fields": [{ "uid": "seo" }] } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "includeCount": true }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/global_fields?include_count=true",
  );
});

Deno.test("list-global-fields: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "global_fields": [{ "uid": "seo" }] } }, {
    body: { "global_fields": [{ "uid": "seo" }] },
  }]);
  await action.execute({ "includeCount": true }, ctx);
  await action.execute({ "includeCount": true, "branch": "dev" }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("list-global-fields: surfaces Contentstack's own error body", async () => {
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
