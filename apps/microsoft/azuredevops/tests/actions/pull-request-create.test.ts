import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/pull-request-create.ts";

const created = one({ pullRequestId: 42 });

/**
 * Azure DevOps defaults to non-draft; an unattended workflow would notify
 * reviewers and start a validation build on every run.
 */
Deno.test("pull-request-create: defaults to a draft, against the API's own default", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  const result = await action.execute!({
    project: "P",
    repository: "api",
    sourceBranch: "feature/x",
    targetBranch: "main",
    title: "Bump deps",
  }, ctx) as { isDraft: boolean };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/git/repositories/api/pullrequests",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.sourceRefName, "refs/heads/feature/x");
  assertEquals(body.targetRefName, "refs/heads/main");
  assertEquals(body.isDraft, true);
  assertEquals(result.isDraft, true);
});

Deno.test("pull-request-create: publishing is explicit", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({
    project: "P",
    repository: "api",
    sourceBranch: "f",
    targetBranch: "main",
    title: "t",
    isDraft: false,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).isDraft, false);
});

Deno.test("pull-request-create: reviewers and work items become id references", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({
    project: "P",
    repository: "api",
    sourceBranch: "f",
    targetBranch: "main",
    title: "t",
    reviewers: "id-1, id-2",
    workItemIds: "101",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.reviewers, [{ id: "id-1" }, { id: "id-2" }]);
  assertEquals(body.workItemRefs, [{ id: "101" }]);
});

/** A pull request from a branch to itself is a mistake worth catching early. */
Deno.test("pull-request-create: identical branches are refused before the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({
        project: "P",
        repository: "api",
        sourceBranch: "main",
        targetBranch: "refs/heads/main",
        title: "t",
      }, ctx),
    Error,
    "same",
  );
  assertEquals(calls.length, 0);
});

Deno.test("pull-request-create: every required field is checked before the request", async () => {
  const base = {
    project: "P",
    repository: "api",
    sourceBranch: "f",
    targetBranch: "main",
    title: "t",
  };
  for (const missing of ["project", "repository", "sourceBranch", "targetBranch", "title"]) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(
      async () => await action.execute!({ ...base, [missing]: "" }, ctx),
      Error,
      missing,
    );
    assertEquals(calls.length, 0, `${missing} reached the wire`);
  }
});

Deno.test("pull-request-create: logs the id and draft state", async () => {
  const { ctx, logs } = mockCtx([created], { display });
  await action.execute!({
    project: "P",
    repository: "api",
    sourceBranch: "f",
    targetBranch: "main",
    title: "t",
  }, ctx);
  assertEquals(logs[0].data, { pullRequestId: 42, isDraft: true });
});
