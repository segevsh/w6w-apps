import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-job-status.ts";

Deno.test("get-job-status: metadata", () => {
  assertEquals(action.key, "get-job-status");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["jobId"]);
});

Deno.test("get-job-status: calls GET /bulk/jobs/job1 on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "job": { "status": "completed" } } }]);
  const out = await action.execute({ "jobId": "job1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/bulk/jobs/job1");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["api_version"], "3.2");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "job": { "status": "completed" } });
});

Deno.test("get-job-status: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "job": { "status": "completed" } } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "jobId": "job1" }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/bulk/jobs/job1");
});

Deno.test("get-job-status: rejects without `jobId` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`jobId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-job-status: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "jobId": "job1" }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
