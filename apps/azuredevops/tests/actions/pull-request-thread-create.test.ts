import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/pull-request-thread-create.ts";

const thread = one({ id: 7, status: "active" });

/** Azure DevOps has no bare comments — a comment is a thread's first entry. */
Deno.test("pull-request-thread-create: posts a thread containing the comment", async () => {
  const { ctx, calls } = mockCtx([thread], { display });
  const result = await action.execute!({
    project: "P",
    repository: "api",
    pullRequestId: "42",
    comment: "Build failed on step 3.",
  }, ctx) as { onDiff: boolean };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/git/repositories/api/pullRequests/42/threads",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.comments, [
    { parentCommentId: 0, content: "Build failed on step 3.", commentType: "text" },
  ]);
  assertEquals(body.status, "active");
  assertEquals(body.threadContext, undefined);
  assertEquals(result.onDiff, false);
});

/** A line comment belongs on the diff, not in the overview. */
Deno.test("pull-request-thread-create: a file path anchors the thread to the diff", async () => {
  const { ctx, calls } = mockCtx([thread], { display });
  const result = await action.execute!({
    project: "P",
    repository: "api",
    pullRequestId: "42",
    comment: "Unused import.",
    filePath: "/src/index.ts",
    line: 42,
  }, ctx) as { onDiff: boolean };
  const context = JSON.parse(calls[0].body!).threadContext;
  assertEquals(context.filePath, "/src/index.ts");
  assertEquals(context.rightFileStart, { line: 42, offset: 1 });
  assertEquals(result.onDiff, true);
});

/** An active thread blocks the merge where policy requires comments resolved. */
Deno.test("pull-request-thread-create: an informational note can be created closed", async () => {
  const { ctx, calls } = mockCtx([thread], { display });
  await action.execute!({
    project: "P",
    repository: "api",
    pullRequestId: "42",
    comment: "Deployed to staging.",
    status: "closed",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).status, "closed");
});

/** The comment is the caller's content. */
Deno.test("pull-request-thread-create: logs the ids, never the comment", async () => {
  const { ctx, logs } = mockCtx([thread], { display });
  await action.execute!({
    project: "P",
    repository: "api",
    pullRequestId: "42",
    comment: "internal detail nobody should log",
  }, ctx);
  assert(!JSON.stringify(logs).includes("internal detail"), JSON.stringify(logs));
  assertEquals(logs[0].data, { pullRequestId: "42", threadId: 7, onDiff: false });
});

Deno.test("pull-request-thread-create: every required field is checked", async () => {
  const base = { project: "P", repository: "api", pullRequestId: "42", comment: "x" };
  for (const missing of ["project", "repository", "pullRequestId", "comment"]) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(
      async () => await action.execute!({ ...base, [missing]: "" }, ctx),
      Error,
      missing,
    );
    assertEquals(calls.length, 0);
  }
});
