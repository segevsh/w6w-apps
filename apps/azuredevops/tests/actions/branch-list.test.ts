import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, list } from "./_shared.ts";
import action from "../../actions/branch-list.ts";

/** Azure DevOps has no branches endpoint — only refs. */
Deno.test("branch-list: filters refs to branches and strips the prefix", async () => {
  const { ctx, calls } = mockCtx([list([
    { name: "refs/heads/main", objectId: "abc" },
    { name: "refs/heads/feature/AB-123", objectId: "def" },
  ])], { display });
  const result = await action.execute!({ project: "P", repository: "api" }, ctx) as {
    names: string[];
    count: number;
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/git/repositories/api/refs",
  );
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), "heads");
  assertEquals(result.names, ["main", "feature/AB-123"]);
  assertEquals(result.count, 2);
});

Deno.test("branch-list: tags are the same call with a different filter", async () => {
  const { ctx, calls } = mockCtx([list([{ name: "refs/tags/v1.0.0" }])], { display });
  const result = await action.execute!({ project: "P", repository: "api", kind: "tags" }, ctx) as {
    names: string[];
  };
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), "tags");
  assertEquals(result.names, ["v1.0.0"]);
});

Deno.test("branch-list: every ref is available with no filter", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({ project: "P", repository: "api", kind: "" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), null);
});

Deno.test("branch-list: the substring filter reaches the wire", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({ project: "P", repository: "api", contains: "AB-123" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filterContains"), "AB-123");
});

Deno.test("branch-list: needs a project and a repository", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ project: "P" }, ctx),
    Error,
    "repository",
  );
  assertEquals(calls.length, 0);
});
