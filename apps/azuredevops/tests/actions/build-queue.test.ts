import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/build-queue.ts";

const queued = one({ id: 99, buildNumber: "20260818.1", status: "notStarted" });

Deno.test("build-queue: posts the definition and reports queued", async () => {
  const { ctx, calls } = mockCtx([queued], { display });
  const result = await action.execute!({ project: "P", definitionId: "12" }, ctx) as {
    queued: boolean;
    id: number;
  };
  assertEquals(calls[0].url.split("?")[0], "https://dev.azure.com/contoso/P/_apis/build/builds");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { definition: { id: 12 }, reason: "manual" });
  assertEquals(result.queued, true);
  assertEquals(result.id, 99);
});

/** The branch selects the pipeline YAML as well as the code. */
Deno.test("build-queue: a bare branch name is expanded to a full ref", async () => {
  const { ctx, calls } = mockCtx([queued], { display });
  await action.execute!({ project: "P", definitionId: "12", sourceBranch: "release/1.2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sourceBranch, "refs/heads/release/1.2");
});

/** Azure DevOps takes variables as a JSON string, not an object. */
Deno.test("build-queue: variables are serialised to a string", async () => {
  const { ctx, calls } = mockCtx([queued], { display });
  await action.execute!({
    project: "P",
    definitionId: "12",
    parameters: '{"environment":"staging"}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).parameters, '{"environment":"staging"}');
});

Deno.test("build-queue: malformed variables are refused by name", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ project: "P", definitionId: "12", parameters: "{oops" }, ctx),
    Error,
    "parameters",
  );
  assertEquals(calls.length, 0);
});

/** The queue request is recorded, so variables must not reach the log either. */
Deno.test("build-queue: logs the ids, never the variables", async () => {
  const { ctx, logs } = mockCtx([queued], { display });
  await action.execute!({
    project: "P",
    definitionId: "12",
    parameters: '{"token":"do-not-log-me"}',
  }, ctx);
  assert(!JSON.stringify(logs).includes("do-not-log-me"), JSON.stringify(logs));
  assertEquals(logs[0].data, { definitionId: "12", buildId: 99 });
});

Deno.test("build-queue: needs a project and a definition", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ project: "P" }, ctx),
    Error,
    "definitionId",
  );
  assertEquals(calls.length, 0);
});

/** A secret in a pipeline variable ends up in the run's history. */
Deno.test("build-queue: warns against putting secrets in variables", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "parameters")!;
  assert(/NOT for secrets/.test(p.hint!), p.hint);
});
