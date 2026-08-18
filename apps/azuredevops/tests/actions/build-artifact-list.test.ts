import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, list } from "./_shared.ts";
import action from "../../actions/build-artifact-list.ts";

Deno.test("build-artifact-list: returns the artifacts and their names", async () => {
  const { ctx, calls } = mockCtx([list([
    { name: "drop", resource: { downloadUrl: "https://x/drop.zip" } },
  ])], { display });
  const result = await action.execute!({ project: "P", buildId: "7" }, ctx) as {
    count: number;
    names: string[];
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/build/builds/7/artifacts",
  );
  assertEquals(result.count, 1);
  assertEquals(result.names, ["drop"]);
});

Deno.test("build-artifact-list: needs a project and a run id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({ project: "P" }, ctx), Error, "buildId");
  assertEquals(calls.length, 0);
});

/** An empty list is ambiguous between a failed run and expired retention. */
Deno.test("build-artifact-list: says what an empty list can mean", () => {
  assert(/cleaned up/.test(action.description!), action.description);
});
