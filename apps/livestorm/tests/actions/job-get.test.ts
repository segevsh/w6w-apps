import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobGet from "../../actions/job-get.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

test("job-get: GETs /jobs/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: single("jobs", "j1", { status: "done" }) }]);
  const result = await jobGet.execute({ id: "j1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/jobs/j1");
  assertEquals(result, { id: "j1", type: "jobs", attributes: { status: "done" } });
});
