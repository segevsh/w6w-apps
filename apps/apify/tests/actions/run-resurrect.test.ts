import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import runResurrect from "../../actions/run-resurrect.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("run-resurrect: POSTs to /v2/actor-runs/{id}/resurrect", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "r1", status: "RUNNING" }) }]);
  const out = await runResurrect.execute({ runId: "r1" }, ctx) as { status: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/actor-runs/r1/resurrect");
  assertEquals(out.status, "RUNNING");
});

test("run-resurrect: an explicit build overrides the run's original one", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "r1" }) }]);
  await runResurrect.execute({ runId: "r1", build: "latest" }, ctx);
  assertEquals(queryOf(calls[0].url), { build: "latest" });
});

/**
 * A resurrected run appends to the *same* storages, so a second resurrection is
 * not a no-op — it can add items a previous step already read.
 */
test("run-resurrect: is declared non-idempotent", () => {
  assertEquals(runResurrect.idempotent, false);
});
