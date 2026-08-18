import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-result-get.ts";

Deno.test("check-result-get: reads one run by check and result id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1" } }]);
  await action.execute!({ checkId: "c1", checkResultId: "r1" }, ctx);
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/check-results/c1/r1");
});

Deno.test("check-result-get: both ids are required, before any request", async () => {
  const noCheck = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ checkResultId: "r1" }, noCheck.ctx),
    Error,
    "`checkId`",
  );
  const noResult = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ checkId: "c1" }, noResult.ctx),
    Error,
    "`checkResultId`",
  );
  assertEquals(noCheck.calls.length + noResult.calls.length, 0);
  // Screenshots and traces are files behind a separate endpoint.
  assert(action.description!.includes("console output"), action.description);
});
