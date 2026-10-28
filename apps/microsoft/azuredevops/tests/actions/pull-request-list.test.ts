import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, list } from "./_shared.ts";
import action from "../../actions/pull-request-list.ts";

/** An unrecognised filter is ignored, so the default silently survives. */
Deno.test("pull-request-list: defaults to active and uses the prefixed criteria", async () => {
  const { ctx, calls } = mockCtx([list([{ pullRequestId: 1 }])], { display });
  const result = await action.execute!({ project: "P", repository: "api" }, ctx) as {
    count: number;
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/git/repositories/api/pullrequests",
  );
  assertEquals(new URL(calls[0].url).searchParams.get("searchCriteria.status"), "active");
  assertEquals(result.count, 1);
});

/** A bare branch name matches nothing, silently. */
Deno.test("pull-request-list: expands a bare branch name to a full ref", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({
    project: "P",
    repository: "api",
    targetBranch: "main",
    sourceBranch: "refs/heads/feature",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("searchCriteria.targetRefName"), "refs/heads/main");
  assertEquals(q.get("searchCriteria.sourceRefName"), "refs/heads/feature");
});

Deno.test("pull-request-list: counts the drafts separately", async () => {
  const { ctx } = mockCtx([list([
    { pullRequestId: 1, isDraft: true },
    { pullRequestId: 2 },
  ])], { display });
  const result = await action.execute!({ project: "P", repository: "api" }, ctx) as {
    draftCount: number;
  };
  assertEquals(result.draftCount, 1);
});

Deno.test("pull-request-list: needs a project and a repository", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ project: "P" }, ctx),
    Error,
    "repository",
  );
  assertEquals(calls.length, 0);
});

Deno.test("pull-request-list: warns that a mistyped filter is ignored", () => {
  assert(/ignores an unrecognised filter/.test(action.description!), action.description);
});
