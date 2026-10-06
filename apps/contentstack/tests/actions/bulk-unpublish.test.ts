import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-unpublish.ts";

Deno.test("bulk-unpublish: metadata", () => {
  assertEquals(action.key, "bulk-unpublish");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "entries",
    "assets",
    "locales",
    "environments",
    "skipWorkflowStageCheck",
    "approvals",
    "branch",
  ]);
});

Deno.test("bulk-unpublish: calls POST /bulk/unpublish on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "ok", "job_id": "job2" } }]);
  const out = await action.execute({
    "assets": [{ "uid": "blta" }],
    "environments": "production",
    "locales": "en-us",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/bulk/unpublish");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["api_version"], "3.2");
  assertEquals(JSON.parse(calls[0].body!), {
    "assets": [{ "uid": "blta" }],
    "locales": ["en-us"],
    "environments": ["production"],
  });
  assertEquals(out, { "notice": "ok", "job_id": "job2" });
});

Deno.test("bulk-unpublish: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "ok", "job_id": "job2" } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "assets": [{ "uid": "blta" }],
    "environments": "production",
    "locales": "en-us",
  }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/bulk/unpublish");
});

Deno.test("bulk-unpublish: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "ok", "job_id": "job2" } }, {
    body: { "notice": "ok", "job_id": "job2" },
  }]);
  await action.execute({
    "assets": [{ "uid": "blta" }],
    "environments": "production",
    "locales": "en-us",
  }, ctx);
  await action.execute({
    "assets": [{ "uid": "blta" }],
    "environments": "production",
    "locales": "en-us",
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("bulk-unpublish: rejects without `environments` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "assets": [{ "uid": "blta" }], "locales": "en-us" }, ctx);
    },
    Error,
    "`environments` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("bulk-unpublish: surfaces Contentstack's own error body", async () => {
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
        "assets": [{ "uid": "blta" }],
        "environments": "production",
        "locales": "en-us",
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
