import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-entry.ts";

Deno.test("delete-entry: metadata", () => {
  assertEquals(action.key, "delete-entry");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "contentTypeUid",
    "entryUid",
    "locale",
    "deleteAllLocalized",
    "branch",
  ]);
});

Deno.test("delete-entry: calls DELETE /content_types/blog/entries/blt9 on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Entry deleted successfully." } }]);
  const out = await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "deleteAllLocalized": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/content_types/blog/entries/blt9?delete_all_localized=true",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "notice": "Entry deleted successfully." });
});

Deno.test("delete-entry: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Entry deleted successfully." } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute(
    { "contentTypeUid": "blog", "entryUid": "blt9", "deleteAllLocalized": true },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/content_types/blog/entries/blt9?delete_all_localized=true",
  );
});

Deno.test("delete-entry: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Entry deleted successfully." } }, {
    body: { "notice": "Entry deleted successfully." },
  }]);
  await action.execute(
    { "contentTypeUid": "blog", "entryUid": "blt9", "deleteAllLocalized": true },
    ctx,
  );
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "deleteAllLocalized": true,
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("delete-entry: rejects without `contentTypeUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "entryUid": "blt9", "deleteAllLocalized": true }, ctx);
    },
    Error,
    "`contentTypeUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("delete-entry: surfaces Contentstack's own error body", async () => {
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
        "deleteAllLocalized": true,
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
