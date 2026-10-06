import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-assets.ts";

Deno.test("list-assets: metadata", () => {
  assertEquals(action.key, "list-assets");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "folder",
    "includeFolders",
    "environment",
    "query",
    "includeCount",
    "includePublishDetails",
    "asc",
    "desc",
    "limit",
    "skip",
    "branch",
  ]);
});

Deno.test("list-assets: calls GET /assets on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "assets": [{ "uid": "blta" }], "count": 1 } }]);
  const out = await action.execute({
    "folder": "cs_root",
    "includeCount": true,
    "desc": "created_at",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/assets?folder=cs_root&include_count=true&desc=created_at",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "assets": [{ "uid": "blta" }], "count": 1 });
});

Deno.test("list-assets: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "assets": [{ "uid": "blta" }], "count": 1 } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "folder": "cs_root", "includeCount": true, "desc": "created_at" }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/assets?folder=cs_root&include_count=true&desc=created_at",
  );
});

Deno.test("list-assets: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "assets": [{ "uid": "blta" }], "count": 1 } }, {
    body: { "assets": [{ "uid": "blta" }], "count": 1 },
  }]);
  await action.execute({ "folder": "cs_root", "includeCount": true, "desc": "created_at" }, ctx);
  await action.execute({
    "folder": "cs_root",
    "includeCount": true,
    "desc": "created_at",
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("list-assets: surfaces Contentstack's own error body", async () => {
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
      await action.execute(
        { "folder": "cs_root", "includeCount": true, "desc": "created_at" },
        ctx,
      );
    },
    Error,
    "Validation failed (code 141)",
  );
});
