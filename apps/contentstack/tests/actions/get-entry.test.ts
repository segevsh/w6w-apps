import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-entry.ts";

Deno.test("get-entry: metadata", () => {
  assertEquals(action.key, "get-entry");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "contentTypeUid",
    "entryUid",
    "locale",
    "version",
    "includeWorkflow",
    "includePublishDetails",
    "branch",
  ]);
});

Deno.test("get-entry: calls GET /content_types/blog/entries/blt9 on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "entry": { "uid": "blt9" } } }]);
  const out = await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "includePublishDetails": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/content_types/blog/entries/blt9?include_publish_details=true",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "entry": { "uid": "blt9" } });
});

Deno.test("get-entry: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "entry": { "uid": "blt9" } } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "includePublishDetails": true,
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/content_types/blog/entries/blt9?include_publish_details=true",
  );
});

Deno.test("get-entry: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "entry": { "uid": "blt9" } } }, {
    body: { "entry": { "uid": "blt9" } },
  }]);
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "includePublishDetails": true,
  }, ctx);
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "includePublishDetails": true,
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("get-entry: rejects without `contentTypeUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "entryUid": "blt9", "includePublishDetails": true }, ctx);
    },
    Error,
    "`contentTypeUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-entry: surfaces Contentstack's own error body", async () => {
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
      await action.execute({
        "contentTypeUid": "blog",
        "entryUid": "blt9",
        "includePublishDetails": true,
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
