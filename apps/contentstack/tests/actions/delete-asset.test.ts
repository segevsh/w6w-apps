import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-asset.ts";

Deno.test("delete-asset: metadata", () => {
  assertEquals(action.key, "delete-asset");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), ["assetUid", "branch"]);
});

Deno.test("delete-asset: calls DELETE /assets/blta on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Asset deleted successfully." } }]);
  const out = await action.execute({ "assetUid": "blta" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/assets/blta");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "notice": "Asset deleted successfully." });
});

Deno.test("delete-asset: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Asset deleted successfully." } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "assetUid": "blta" }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/assets/blta");
});

Deno.test("delete-asset: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Asset deleted successfully." } }, {
    body: { "notice": "Asset deleted successfully." },
  }]);
  await action.execute({ "assetUid": "blta" }, ctx);
  await action.execute({ "assetUid": "blta", "branch": "dev" }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("delete-asset: rejects without `assetUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`assetUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("delete-asset: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "assetUid": "blta" }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
