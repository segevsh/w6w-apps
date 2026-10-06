import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-asset.ts";

Deno.test("get-asset: metadata", () => {
  assertEquals(action.key, "get-asset");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "assetUid",
    "version",
    "includePath",
    "includePublishDetails",
    "branch",
  ]);
});

Deno.test("get-asset: calls GET /assets/blta on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "asset": { "uid": "blta" } } }]);
  const out = await action.execute({ "assetUid": "blta", "includePath": true }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/assets/blta?include_path=true");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "asset": { "uid": "blta" } });
});

Deno.test("get-asset: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "asset": { "uid": "blta" } } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "assetUid": "blta", "includePath": true }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/assets/blta?include_path=true",
  );
});

Deno.test("get-asset: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "asset": { "uid": "blta" } } }, {
    body: { "asset": { "uid": "blta" } },
  }]);
  await action.execute({ "assetUid": "blta", "includePath": true }, ctx);
  await action.execute({ "assetUid": "blta", "includePath": true, "branch": "dev" }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("get-asset: rejects without `assetUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "includePath": true }, ctx);
    },
    Error,
    "`assetUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-asset: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "assetUid": "blta", "includePath": true }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
