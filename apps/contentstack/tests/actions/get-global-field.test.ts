import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-global-field.ts";

Deno.test("get-global-field: metadata", () => {
  assertEquals(action.key, "get-global-field");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "globalFieldUid",
    "version",
    "includeGlobalFieldSchema",
    "branch",
  ]);
});

Deno.test("get-global-field: calls GET /global_fields/seo on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "global_field": { "uid": "seo" } } }]);
  const out = await action.execute({ "globalFieldUid": "seo" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/global_fields/seo");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "global_field": { "uid": "seo" } });
});

Deno.test("get-global-field: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "global_field": { "uid": "seo" } } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "globalFieldUid": "seo" }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/global_fields/seo");
});

Deno.test("get-global-field: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "global_field": { "uid": "seo" } } }, {
    body: { "global_field": { "uid": "seo" } },
  }]);
  await action.execute({ "globalFieldUid": "seo" }, ctx);
  await action.execute({ "globalFieldUid": "seo", "branch": "dev" }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("get-global-field: rejects without `globalFieldUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`globalFieldUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-global-field: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "globalFieldUid": "seo" }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
