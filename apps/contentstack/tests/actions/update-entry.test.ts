import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-entry.ts";

Deno.test("update-entry: metadata", () => {
  assertEquals(action.key, "update-entry");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "contentTypeUid",
    "entryUid",
    "entry",
    "locale",
    "branch",
  ]);
});

Deno.test("update-entry: calls PUT /content_types/blog/entries/blt9 on the NA host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Entry updated successfully.", "entry": { "uid": "blt9" } },
  }]);
  const out = await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "entry": { "title": "New" },
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/content_types/blog/entries/blt9");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "entry": { "title": "New" } });
  assertEquals(out, { "notice": "Entry updated successfully.", "entry": { "uid": "blt9" } });
});

Deno.test("update-entry: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Entry updated successfully.", "entry": { "uid": "blt9" } },
  }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "entry": { "title": "New" },
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/content_types/blog/entries/blt9",
  );
});

Deno.test("update-entry: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Entry updated successfully.", "entry": { "uid": "blt9" } },
  }, { body: { "notice": "Entry updated successfully.", "entry": { "uid": "blt9" } } }]);
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "entry": { "title": "New" },
  }, ctx);
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "entry": { "title": "New" },
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("update-entry: rejects without `contentTypeUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "entryUid": "blt9", "entry": { "title": "New" } }, ctx);
    },
    Error,
    "`contentTypeUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-entry: surfaces Contentstack's own error body", async () => {
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
        "entry": { "title": "New" },
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
