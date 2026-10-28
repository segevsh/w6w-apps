import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/build-cancel.ts";

/** The status becomes `cancelling`, not cancelled — the agent has to notice. */
Deno.test("build-cancel: PATCHes the status and does not claim it stopped", async () => {
  const { ctx, calls } = mockCtx([one({ id: 7, status: "cancelling" })], { display });
  const result = await action.execute!({ project: "P", buildId: "7" }, ctx) as {
    status: string;
    stopped: boolean;
  };
  assertEquals(calls[0].url.split("?")[0], "https://dev.azure.com/contoso/P/_apis/build/builds/7");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { status: "cancelling" });
  assertEquals(result.status, "cancelling");
  assertEquals(result.stopped, false);
});

Deno.test("build-cancel: an already-completed run reports stopped", async () => {
  const { ctx } = mockCtx([one({ id: 7, status: "completed" })], { display });
  const result = await action.execute!({ project: "P", buildId: "7" }, ctx) as { stopped: boolean };
  assertEquals(result.stopped, true);
});

Deno.test("build-cancel: needs a project and a run id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({ project: "P" }, ctx), Error, "buildId");
  assertEquals(calls.length, 0);
});

/** `always()` steps still run after a cancellation. */
Deno.test("build-cancel: says what cancelling actually does", () => {
  assert(/always\(\)` steps still run/.test(action.description!), action.description);
});
