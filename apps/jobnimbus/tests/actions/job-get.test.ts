import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobGet from "../../actions/job-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("job-get: fetches by jnid and returns the record unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "j1", name: "Kenny G's Roof" } }]);
  const out = await jobGet.execute({ jnid: "j1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/jobs/j1");
  assertEquals(out, { jnid: "j1", name: "Kenny G's Roof" });
});
