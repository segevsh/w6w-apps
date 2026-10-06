import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unpublish-entry.ts";

Deno.test("unpublish-entry: metadata", () => {
  assertEquals(action.key, "unpublish-entry");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "contentTypeUid",
    "entryUid",
    "environments",
    "locales",
    "locale",
    "version",
    "scheduledAt",
    "branch",
  ]);
});

Deno.test("unpublish-entry: calls POST /content_types/blog/entries/blt9/unpublish on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "ok" } }]);
  const out = await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "environments": ["production"],
    "scheduledAt": "2026-10-07T12:34:36.000Z",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/content_types/blog/entries/blt9/unpublish",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "entry": { "environments": ["production"] },
    "scheduled_at": "2026-10-07T12:34:36.000Z",
  });
  assertEquals(out, { "notice": "ok" });
});

Deno.test("unpublish-entry: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "ok" } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "environments": ["production"],
    "scheduledAt": "2026-10-07T12:34:36.000Z",
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/content_types/blog/entries/blt9/unpublish",
  );
});

Deno.test("unpublish-entry: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "ok" } }, { body: { "notice": "ok" } }]);
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "environments": ["production"],
    "scheduledAt": "2026-10-07T12:34:36.000Z",
  }, ctx);
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "environments": ["production"],
    "scheduledAt": "2026-10-07T12:34:36.000Z",
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("unpublish-entry: rejects without `contentTypeUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({
        "entryUid": "blt9",
        "environments": ["production"],
        "scheduledAt": "2026-10-07T12:34:36.000Z",
      }, ctx);
    },
    Error,
    "`contentTypeUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("unpublish-entry: surfaces Contentstack's own error body", async () => {
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
        "environments": ["production"],
        "scheduledAt": "2026-10-07T12:34:36.000Z",
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
