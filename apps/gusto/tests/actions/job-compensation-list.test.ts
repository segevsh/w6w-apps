import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-compensation-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("job-compensation-list: reads a job's compensation history", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ uuid: "cp1" }] }], conn);
  await action.execute!({ jobId: "j1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/jobs/j1/compensations");
});

Deno.test("job-compensation-list: a missing job is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "jobId");
});

/** Annualising without payment_unit is how 4000 becomes ambiguous. */
Deno.test("job-compensation-list: warns about payment_unit", () => {
  assert(/payment_unit/.test(action.description!), action.description);
});
