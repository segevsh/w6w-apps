import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/build-get.ts";

Deno.test("build-get: a succeeded run reports both booleans true", async () => {
  const { ctx, calls } = mockCtx([one({ id: 7, status: "completed", result: "succeeded" })], {
    display,
  });
  const result = await action.execute!({ project: "P", buildId: "7" }, ctx) as {
    finished: boolean;
    succeeded: boolean;
  };
  assertEquals(calls[0].url.split("?")[0], "https://dev.azure.com/contoso/P/_apis/build/builds/7");
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, true);
});

/** A step failed and was configured to continue — a deployment should ask. */
Deno.test("build-get: partiallySucceeded is finished but not succeeded", async () => {
  const { ctx } = mockCtx([one({ status: "completed", result: "partiallySucceeded" })], {
    display,
  });
  const result = await action.execute!({ project: "P", buildId: "7" }, ctx) as {
    finished: boolean;
    succeeded: boolean;
  };
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, false);
});

Deno.test("build-get: a running build is neither finished nor succeeded", async () => {
  const { ctx } = mockCtx([one({ status: "inProgress" })], { display });
  const result = await action.execute!({ project: "P", buildId: "7" }, ctx) as {
    finished: boolean;
    succeeded: boolean;
  };
  assertEquals(result.finished, false);
  assertEquals(result.succeeded, false);
});

Deno.test("build-get: needs a project and a run id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({ project: "P" }, ctx), Error, "buildId");
  assertEquals(calls.length, 0);
});

Deno.test("build-get: says why partiallySucceeded is not folded into success", () => {
  assert(/stop and ask/.test(action.description!), action.description);
});
