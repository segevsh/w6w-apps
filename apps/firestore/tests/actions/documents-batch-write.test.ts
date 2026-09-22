import { assertEquals, assertRejects } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/documents-batch-write.ts";

Deno.test("documents-batch-write: POSTs the Write array and returns per-write status", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { writeResults: [{ updateTime: "t" }], status: [{}] },
  }], { display: DISPLAY });

  const result = await action.execute({
    writes: [{ op: "update", path: "users/alice", mask: "age", data: { age: 37 } }],
    labels: { job: "nightly" },
  }, ctx) as { writeResults?: unknown[]; status?: unknown[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents:batchWrite",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.writes[0].updateMask, { fieldPaths: ["age"] });
  assertEquals(body.labels, { job: "nightly" });
  assertEquals(result.writeResults?.length, 1);
  assertEquals(result.status?.length, 1);
});

Deno.test("documents-batch-write: labels are optional", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: DISPLAY });
  await action.execute({ writes: [{ op: "delete", path: "users/bob" }] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).labels, undefined);
});

Deno.test("documents-batch-write: a bad entry fails before the request", async () => {
  const { ctx, calls } = mockCtx([], { display: DISPLAY });
  await assertRejects(
    async () =>
      await action.execute({ writes: [{ op: "update", path: "users/alice", data: {} }] }, ctx),
    Error,
    "needs `mask`",
  );
  assertEquals(calls.length, 0);
});
