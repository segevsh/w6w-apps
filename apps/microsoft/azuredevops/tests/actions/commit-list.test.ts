import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, list } from "./_shared.ts";
import action from "../../actions/commit-list.ts";

/**
 * The branch is a BARE name here, unlike the pull request endpoints in the same
 * API — so a ref prefix is stripped rather than passed through to silence.
 */
Deno.test("commit-list: strips a refs/heads prefix from the branch", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({ project: "P", repository: "api", branch: "refs/heads/main" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("searchCriteria.itemVersion.version"),
    "main",
  );
});

Deno.test("commit-list: a bare branch name passes through unchanged", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({ project: "P", repository: "api", branch: "main" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("searchCriteria.itemVersion.version"),
    "main",
  );
});

Deno.test("commit-list: returns the distinct authors in the range", async () => {
  const { ctx, calls } = mockCtx([list([
    { commitId: "a", author: { name: "Ada" } },
    { commitId: "b", author: { name: "Grace" } },
    { commitId: "c", author: { name: "Ada" } },
  ])], { display });
  const result = await action.execute!({ project: "P", repository: "api" }, ctx) as {
    count: number;
    authors: string[];
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/git/repositories/api/commits",
  );
  assertEquals(result.count, 3);
  assertEquals(result.authors, ["Ada", "Grace"]);
});

Deno.test("commit-list: the date window uses the prefixed criteria", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({
    project: "P",
    repository: "api",
    fromDate: "2026-08-01",
    toDate: "2026-08-18",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("searchCriteria.fromDate"), "2026-08-01");
  assertEquals(q.get("searchCriteria.toDate"), "2026-08-18");
});

Deno.test("commit-list: needs a project and a repository", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ project: "P" }, ctx),
    Error,
    "repository",
  );
  assertEquals(calls.length, 0);
});

Deno.test("commit-list: names the bare-versus-ref inconsistency", () => {
  assert(/BARE name here/.test(action.description!), action.description);
});
