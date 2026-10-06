import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-content-types.ts";

Deno.test("list-content-types: metadata", () => {
  assertEquals(action.key, "list-content-types");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "includeCount",
    "includeGlobalFieldSchema",
    "limit",
    "skip",
    "branch",
  ]);
});

Deno.test("list-content-types: calls GET /content_types on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "content_types": [{ "uid": "blog" }], "count": 1 } }]);
  const out = await action.execute({ "includeCount": true, "limit": 10 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/content_types?include_count=true&limit=10",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "content_types": [{ "uid": "blog" }], "count": 1 });
});

Deno.test("list-content-types: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "content_types": [{ "uid": "blog" }], "count": 1 } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "includeCount": true, "limit": 10 }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/content_types?include_count=true&limit=10",
  );
});

Deno.test("list-content-types: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "content_types": [{ "uid": "blog" }], "count": 1 } }, {
    body: { "content_types": [{ "uid": "blog" }], "count": 1 },
  }]);
  await action.execute({ "includeCount": true, "limit": 10 }, ctx);
  await action.execute({ "includeCount": true, "limit": 10, "branch": "dev" }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("list-content-types: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "includeCount": true, "limit": 10 }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
