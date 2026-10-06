import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-publish.ts";

Deno.test("bulk-publish: metadata", () => {
  assertEquals(action.key, "bulk-publish");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "entries",
    "assets",
    "locales",
    "environments",
    "publishWithReference",
    "skipWorkflowStageCheck",
    "approvals",
    "branch",
  ]);
});

Deno.test("bulk-publish: calls POST /bulk/publish on the NA host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Your publish request is in progress.", "job_id": "job1" },
  }]);
  const out = await action.execute({
    "entries": [{ "uid": "blt9", "content_type": "blog", "locale": "en-us" }],
    "environments": "production",
    "skipWorkflowStageCheck": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/bulk/publish?skip_workflow_stage_check=true",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["api_version"], "3.2");
  assertEquals(JSON.parse(calls[0].body!), {
    "entries": [{ "uid": "blt9", "content_type": "blog", "locale": "en-us" }],
    "environments": ["production"],
  });
  assertEquals(out, { "notice": "Your publish request is in progress.", "job_id": "job1" });
});

Deno.test("bulk-publish: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Your publish request is in progress.", "job_id": "job1" },
  }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "entries": [{ "uid": "blt9", "content_type": "blog", "locale": "en-us" }],
    "environments": "production",
    "skipWorkflowStageCheck": true,
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/bulk/publish?skip_workflow_stage_check=true",
  );
});

Deno.test("bulk-publish: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Your publish request is in progress.", "job_id": "job1" },
  }, { body: { "notice": "Your publish request is in progress.", "job_id": "job1" } }]);
  await action.execute({
    "entries": [{ "uid": "blt9", "content_type": "blog", "locale": "en-us" }],
    "environments": "production",
    "skipWorkflowStageCheck": true,
  }, ctx);
  await action.execute({
    "entries": [{ "uid": "blt9", "content_type": "blog", "locale": "en-us" }],
    "environments": "production",
    "skipWorkflowStageCheck": true,
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("bulk-publish: rejects without `environments` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({
        "entries": [{ "uid": "blt9", "content_type": "blog", "locale": "en-us" }],
        "skipWorkflowStageCheck": true,
      }, ctx);
    },
    Error,
    "`environments` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("bulk-publish: surfaces Contentstack's own error body", async () => {
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
        "entries": [{ "uid": "blt9", "content_type": "blog", "locale": "en-us" }],
        "environments": "production",
        "skipWorkflowStageCheck": true,
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
