import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-entries.ts";

Deno.test("list-entries: metadata", () => {
  assertEquals(action.key, "list-entries");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "contentTypeUid",
    "locale",
    "query",
    "includeCount",
    "includeWorkflow",
    "includePublishDetails",
    "limit",
    "skip",
    "branch",
  ]);
});

Deno.test("list-entries: calls GET /content_types/blog/entries on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "entries": [{ "uid": "blt9" }] } }]);
  const out = await action.execute({
    "contentTypeUid": "blog",
    "locale": "en-us",
    "query": { "title": "Home" },
    "limit": 5,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/content_types/blog/entries?locale=en-us&query=%7B%22title%22%3A%22Home%22%7D&limit=5",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "entries": [{ "uid": "blt9" }] });
});

Deno.test("list-entries: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "entries": [{ "uid": "blt9" }] } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "contentTypeUid": "blog",
    "locale": "en-us",
    "query": { "title": "Home" },
    "limit": 5,
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/content_types/blog/entries?locale=en-us&query=%7B%22title%22%3A%22Home%22%7D&limit=5",
  );
});

Deno.test("list-entries: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "entries": [{ "uid": "blt9" }] } }, {
    body: { "entries": [{ "uid": "blt9" }] },
  }]);
  await action.execute({
    "contentTypeUid": "blog",
    "locale": "en-us",
    "query": { "title": "Home" },
    "limit": 5,
  }, ctx);
  await action.execute({
    "contentTypeUid": "blog",
    "locale": "en-us",
    "query": { "title": "Home" },
    "limit": 5,
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("list-entries: rejects without `contentTypeUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "locale": "en-us", "query": { "title": "Home" }, "limit": 5 }, ctx);
    },
    Error,
    "`contentTypeUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-entries: surfaces Contentstack's own error body", async () => {
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
        "locale": "en-us",
        "query": { "title": "Home" },
        "limit": 5,
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
