import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, list } from "./_shared.ts";
import action from "../../actions/build-definition-list.ts";

/**
 * The latest run may still be going; only the latest COMPLETED run has a
 * verdict.
 */
Deno.test("build-definition-list: reports failing pipelines from the completed run", async () => {
  const { ctx, calls } = mockCtx([list([
    { id: 1, name: "CI", latestCompletedBuild: { result: "succeeded" } },
    { id: 2, name: "Nightly", latestCompletedBuild: { result: "failed" } },
    { id: 3, name: "New", latestBuild: { status: "inProgress" } },
  ])], { display });
  const result = await action.execute!({ project: "P" }, ctx) as {
    count: number;
    failing: string[];
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/build/definitions",
  );
  assertEquals(new URL(calls[0].url).searchParams.get("includeLatestBuilds"), "true");
  assertEquals(result.count, 3);
  // "New" has never completed a run, so it is not failing.
  assertEquals(result.failing, ["Nightly"]);
});

Deno.test("build-definition-list: latest runs can be turned off", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({ project: "P", includeLatestBuilds: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("includeLatestBuilds"), null);
});

Deno.test("build-definition-list: needs a project", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "project");
  assertEquals(calls.length, 0);
});
