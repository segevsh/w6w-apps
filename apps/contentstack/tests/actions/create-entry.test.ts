import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-entry.ts";

Deno.test("create-entry: metadata", () => {
  assertEquals(action.key, "create-entry");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), ["contentTypeUid", "entry", "locale", "branch"]);
});

Deno.test("create-entry: calls POST /content_types/blog/entries on the NA host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Entry created successfully.", "entry": { "uid": "blt9" } },
  }]);
  const out = await action.execute({
    "contentTypeUid": "blog",
    "entry": { "title": "Home" },
    "locale": "en-us",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/content_types/blog/entries?locale=en-us",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "entry": { "title": "Home" } });
  assertEquals(out, { "notice": "Entry created successfully.", "entry": { "uid": "blt9" } });
});

Deno.test("create-entry: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Entry created successfully.", "entry": { "uid": "blt9" } },
  }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "contentTypeUid": "blog",
    "entry": { "title": "Home" },
    "locale": "en-us",
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/content_types/blog/entries?locale=en-us",
  );
});

Deno.test("create-entry: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Entry created successfully.", "entry": { "uid": "blt9" } },
  }, { body: { "notice": "Entry created successfully.", "entry": { "uid": "blt9" } } }]);
  await action.execute({
    "contentTypeUid": "blog",
    "entry": { "title": "Home" },
    "locale": "en-us",
  }, ctx);
  await action.execute({
    "contentTypeUid": "blog",
    "entry": { "title": "Home" },
    "locale": "en-us",
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("create-entry: rejects without `contentTypeUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "entry": { "title": "Home" }, "locale": "en-us" }, ctx);
    },
    Error,
    "`contentTypeUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-entry: surfaces Contentstack's own error body", async () => {
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
        "entry": { "title": "Home" },
        "locale": "en-us",
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
