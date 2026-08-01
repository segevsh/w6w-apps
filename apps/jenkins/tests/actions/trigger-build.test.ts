import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/trigger-build.ts";

const display = { endpoint: "https://ci.example.com" };

Deno.test("trigger-build: POSTs /job/<name>/build with no body when parameters are omitted", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, headers: { location: "https://ci.example.com/queue/item/1543/" } },
  ], { display });
  const result = await action.execute({ job: "my-job" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/job/my-job/build");
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    queueId: 1543,
    queueUrl: "https://ci.example.com/queue/item/1543/",
  });
});

Deno.test("trigger-build: POSTs /job/<name>/build when parameters is an empty object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201 }], { display });
  await action.execute({ job: "my-job", parameters: {} }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/job/my-job/build");
});

Deno.test("trigger-build: switches to /job/<name>/buildWithParameters with a form body when parameters is given", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, headers: { location: "https://ci.example.com/queue/item/7/" } },
  ], { display });
  const result = await action.execute(
    { job: "my-job", parameters: { branch: "main", retries: 3 } },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/job/my-job/buildWithParameters");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("branch"), "main");
  assertEquals(body.get("retries"), "3");
  assertEquals(result.queueId, 7);
});

Deno.test("trigger-build: expands a folder-nested job path", async () => {
  const { ctx, calls } = mockCtx([{ status: 201 }], { display });
  await action.execute({ job: "my-folder/my-pipeline" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/job/my-folder/job/my-pipeline/build");
});

Deno.test("trigger-build: returns undefined queueId/queueUrl when no Location header is present", async () => {
  const { ctx } = mockCtx([{ status: 201 }], { display });
  const result = await action.execute({ job: "my-job" }, ctx);
  assertEquals(result, { queueId: undefined, queueUrl: undefined });
});
