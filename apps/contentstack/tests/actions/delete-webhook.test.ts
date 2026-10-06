import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-webhook.ts";

Deno.test("delete-webhook: metadata", () => {
  assertEquals(action.key, "delete-webhook");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), ["webhookUid"]);
});

Deno.test("delete-webhook: calls DELETE /webhooks/bltw on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "The webhook was deleted successfully." } }]);
  const out = await action.execute({ "webhookUid": "bltw" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/webhooks/bltw");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "notice": "The webhook was deleted successfully." });
});

Deno.test("delete-webhook: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { "notice": "The webhook was deleted successfully." } }],
    {
      connection: { display: { region: "azure-eu" } },
    },
  );
  await action.execute({ "webhookUid": "bltw" }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/webhooks/bltw");
});

Deno.test("delete-webhook: rejects without `webhookUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`webhookUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("delete-webhook: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "webhookUid": "bltw" }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
