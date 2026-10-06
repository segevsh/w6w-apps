import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-content-type.ts";

Deno.test("get-content-type: metadata", () => {
  assertEquals(action.key, "get-content-type");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "contentTypeUid",
    "version",
    "includeGlobalFieldSchema",
    "branch",
  ]);
});

Deno.test("get-content-type: calls GET /content_types/blog on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "content_type": { "uid": "blog" } } }]);
  const out = await action.execute({ "contentTypeUid": "blog", "version": 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/content_types/blog?version=2");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "content_type": { "uid": "blog" } });
});

Deno.test("get-content-type: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "content_type": { "uid": "blog" } } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "contentTypeUid": "blog", "version": 2 }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/content_types/blog?version=2",
  );
});

Deno.test("get-content-type: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "content_type": { "uid": "blog" } } }, {
    body: { "content_type": { "uid": "blog" } },
  }]);
  await action.execute({ "contentTypeUid": "blog", "version": 2 }, ctx);
  await action.execute({ "contentTypeUid": "blog", "version": 2, "branch": "dev" }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("get-content-type: rejects without `contentTypeUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "version": 2 }, ctx);
    },
    Error,
    "`contentTypeUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-content-type: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "contentTypeUid": "blog", "version": 2 }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
