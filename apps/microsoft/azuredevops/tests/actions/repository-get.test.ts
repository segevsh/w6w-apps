import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/repository-get.ts";

Deno.test("repository-get: fetches one repository by name", async () => {
  const { ctx, calls } = mockCtx([one({
    id: "r1",
    name: "api",
    defaultBranch: "refs/heads/main",
  })], { display });
  const result = await action.execute!({ project: "Payments", repository: "api" }, ctx) as {
    defaultBranch: string;
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/Payments/_apis/git/repositories/api",
  );
  assertEquals(result.defaultBranch, "refs/heads/main");
});

Deno.test("repository-get: needs a project and a repository", async () => {
  const noProject = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ repository: "api" }, noProject.ctx),
    Error,
    "project",
  );
  const noRepo = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ project: "P" }, noRepo.ctx),
    Error,
    "repository",
  );
});

/** The default branch comes back as a full ref, which the git calls want. */
Deno.test("repository-get: says the default branch is a full ref", () => {
  assert(/refs\/heads/.test(action.description!), action.description);
});
