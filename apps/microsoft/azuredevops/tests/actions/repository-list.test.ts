import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, list } from "./_shared.ts";
import action from "../../actions/repository-list.ts";

/** A disabled repository is still listed and rejects every operation. */
test("repository-list: separates the disabled repositories", async () => {
  const { ctx, calls } = mockCtx([list([
    { id: "r1", name: "api" },
    { id: "r2", name: "legacy", isDisabled: true },
  ])], { display });
  const result = await action.execute!({ project: "Payments" }, ctx) as {
    count: number;
    disabled: string[];
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/Payments/_apis/git/repositories",
  );
  assertEquals(result.count, 2);
  assertEquals(result.disabled, ["legacy"]);
});

test("repository-list: needs a project", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "project");
  assertEquals(calls.length, 0);
});

/** Azure DevOps nests repositories inside projects. */
test("repository-list: names the nesting", () => {
  assert(/nests them/.test(action.description!), action.description);
});
