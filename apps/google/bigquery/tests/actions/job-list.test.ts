import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-list.ts";

const display = { projectId: "p1" };

/** BigQuery returns only the caller's own jobs unless allUsers is set. */
Deno.test("job-list: allUsers is opt-in and reaches the wire", async () => {
  const off = mockCtx([{ status: 200, body: { jobs: [] } }], { display });
  await action.execute!({}, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.get("allUsers"), null);

  const on = mockCtx([{ status: 200, body: { jobs: [{ id: "j1" }] } }], { display });
  const result = await action.execute!({ allUsers: true, stateFilter: "running" }, on.ctx);
  const q = new URL(on.calls[0].url).searchParams;
  assertEquals(q.get("allUsers"), "true");
  assertEquals(q.get("stateFilter"), "running");
  assertEquals(result, [{ id: "j1" }]);
});
