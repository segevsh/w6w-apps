import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/set-entry-workflow-stage.ts";

Deno.test("set-entry-workflow-stage: metadata", () => {
  assertEquals(action.key, "set-entry-workflow-stage");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "contentTypeUid",
    "entryUid",
    "workflowStageUid",
    "comment",
    "dueDate",
    "notify",
    "locale",
  ]);
});

Deno.test("set-entry-workflow-stage: calls POST /content_types/blog/entries/blt9/workflow on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Entry stage updated." } }]);
  const out = await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "workflowStageUid": "blts",
    "comment": "Ready",
    "notify": false,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/content_types/blog/entries/blt9/workflow",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "workflow": { "workflow_stage": { "uid": "blts", "comment": "Ready", "notify": false } },
  });
  assertEquals(out, { "notice": "Entry stage updated." });
});

Deno.test("set-entry-workflow-stage: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Entry stage updated." } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "contentTypeUid": "blog",
    "entryUid": "blt9",
    "workflowStageUid": "blts",
    "comment": "Ready",
    "notify": false,
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/content_types/blog/entries/blt9/workflow",
  );
});

Deno.test("set-entry-workflow-stage: rejects without `contentTypeUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({
        "entryUid": "blt9",
        "workflowStageUid": "blts",
        "comment": "Ready",
        "notify": false,
      }, ctx);
    },
    Error,
    "`contentTypeUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("set-entry-workflow-stage: surfaces Contentstack's own error body", async () => {
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
        "entryUid": "blt9",
        "workflowStageUid": "blts",
        "comment": "Ready",
        "notify": false,
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
