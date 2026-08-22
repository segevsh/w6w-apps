import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, list } from "./_shared.ts";
import action from "../../actions/build-list.ts";

/**
 * `result` does not exist until `status` is completed — so a running build
 * counted by result reads as nothing at all.
 */
Deno.test("build-list: counts results and running runs separately", async () => {
  const { ctx, calls } = mockCtx([list([
    { id: 1, status: "completed", result: "succeeded" },
    { id: 2, status: "completed", result: "failed" },
    { id: 3, status: "completed", result: "partiallySucceeded" },
    { id: 4, status: "inProgress" },
  ])], { display });
  const result = await action.execute!({ project: "P" }, ctx) as {
    count: number;
    resultCounts: Record<string, number>;
    runningCount: number;
  };
  assertEquals(calls[0].url.split("?")[0], "https://dev.azure.com/contoso/P/_apis/build/builds");
  assertEquals(result.count, 4);
  assertEquals(result.resultCounts, { succeeded: 1, failed: 1, partiallySucceeded: 1 });
  assertEquals(result.runningCount, 1);
});

Deno.test("build-list: pipeline ids are sent comma-delimited", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({ project: "P", definitionIds: "12, 34" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("definitions"), "12,34");
});

Deno.test("build-list: a bare branch name is expanded to a full ref", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({ project: "P", branchName: "main" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("branchName"), "refs/heads/main");
});

Deno.test("build-list: the status and result filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({ project: "P", statusFilter: "completed", resultFilter: "failed" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("statusFilter"), "completed");
  assertEquals(q.get("resultFilter"), "failed");
});

Deno.test("build-list: needs a project", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "project");
  assertEquals(calls.length, 0);
});

Deno.test("build-list: says what checking result on a running build does", () => {
  assert(/concludes it passed/.test(action.description!), action.description);
});
