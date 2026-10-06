import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-release-item.ts";

Deno.test("add-release-item: metadata", () => {
  assertEquals(action.key, "add-release-item");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "releaseUid",
    "uid",
    "contentTypeUid",
    "version",
    "action",
    "locale",
    "branch",
  ]);
});

Deno.test("add-release-item: calls POST /releases/bltr/item on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Item added" } }]);
  const out = await action.execute({
    "releaseUid": "bltr",
    "uid": "blt9",
    "contentTypeUid": "blog",
    "action": "publish",
    "version": 2,
    "locale": "en-us",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/releases/bltr/item");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "item": {
      "uid": "blt9",
      "content_type_uid": "blog",
      "version": 2,
      "action": "publish",
      "locale": "en-us",
    },
  });
  assertEquals(out, { "notice": "Item added" });
});

Deno.test("add-release-item: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Item added" } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "releaseUid": "bltr",
    "uid": "blt9",
    "contentTypeUid": "blog",
    "action": "publish",
    "version": 2,
    "locale": "en-us",
  }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/releases/bltr/item");
});

Deno.test("add-release-item: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Item added" } }, {
    body: { "notice": "Item added" },
  }]);
  await action.execute({
    "releaseUid": "bltr",
    "uid": "blt9",
    "contentTypeUid": "blog",
    "action": "publish",
    "version": 2,
    "locale": "en-us",
  }, ctx);
  await action.execute({
    "releaseUid": "bltr",
    "uid": "blt9",
    "contentTypeUid": "blog",
    "action": "publish",
    "version": 2,
    "locale": "en-us",
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("add-release-item: rejects without `releaseUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({
        "uid": "blt9",
        "contentTypeUid": "blog",
        "action": "publish",
        "version": 2,
        "locale": "en-us",
      }, ctx);
    },
    Error,
    "`releaseUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("add-release-item: surfaces Contentstack's own error body", async () => {
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
        "releaseUid": "bltr",
        "uid": "blt9",
        "contentTypeUid": "blog",
        "action": "publish",
        "version": 2,
        "locale": "en-us",
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
