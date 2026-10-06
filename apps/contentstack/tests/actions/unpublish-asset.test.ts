import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unpublish-asset.ts";

Deno.test("unpublish-asset: metadata", () => {
  assertEquals(action.key, "unpublish-asset");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "assetUid",
    "environments",
    "locales",
    "version",
    "scheduledAt",
    "branch",
  ]);
});

Deno.test("unpublish-asset: calls POST /assets/blta/unpublish on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "ok" } }]);
  const out = await action.execute({ "assetUid": "blta", "environments": "production" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/assets/blta/unpublish");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "asset": { "environments": ["production"] } });
  assertEquals(out, { "notice": "ok" });
});

Deno.test("unpublish-asset: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "ok" } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "assetUid": "blta", "environments": "production" }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/assets/blta/unpublish");
});

Deno.test("unpublish-asset: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "ok" } }, { body: { "notice": "ok" } }]);
  await action.execute({ "assetUid": "blta", "environments": "production" }, ctx);
  await action.execute({ "assetUid": "blta", "environments": "production", "branch": "dev" }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("unpublish-asset: rejects without `assetUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "environments": "production" }, ctx);
    },
    Error,
    "`assetUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("unpublish-asset: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "assetUid": "blta", "environments": "production" }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
