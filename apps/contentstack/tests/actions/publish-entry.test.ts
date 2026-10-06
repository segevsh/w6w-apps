import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/publish-entry.ts";

Deno.test("publish-entry: metadata", () => {
  assertEquals(action.key, "publish-entry");
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

Deno.test("publish-entry: calls POST /content_types/blog/entries/blt9/publish on the NA host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "The requested action has been performed." },
  }]);
  const out = await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "environments": "production,staging",
    "locales": ["en-us"],
    "locale": "en-us",
    "version": 3,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/content_types/blog/entries/blt9/publish",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "entry": { "environments": ["production", "staging"], "locales": ["en-us"] },
    "locale": "en-us",
    "version": 3,
  });
  assertEquals(out, { "notice": "The requested action has been performed." });
});

Deno.test("publish-entry: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "The requested action has been performed." },
  }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "environments": "production,staging",
    "locales": ["en-us"],
    "locale": "en-us",
    "version": 3,
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/content_types/blog/entries/blt9/publish",
  );
});

Deno.test("publish-entry: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "The requested action has been performed." },
  }, { body: { "notice": "The requested action has been performed." } }]);
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "environments": "production,staging",
    "locales": ["en-us"],
    "locale": "en-us",
    "version": 3,
  }, ctx);
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "environments": "production,staging",
    "locales": ["en-us"],
    "locale": "en-us",
    "version": 3,
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("publish-entry: rejects without `contentTypeUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({
        "entryUid": "blt9",
        "environments": "production,staging",
        "locales": ["en-us"],
        "locale": "en-us",
        "version": 3,
      }, ctx);
    },
    Error,
    "`contentTypeUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("publish-entry: surfaces Contentstack's own error body", async () => {
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
        "environments": "production,staging",
        "locales": ["en-us"],
        "locale": "en-us",
        "version": 3,
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
