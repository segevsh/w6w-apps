import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-get.ts";

const bounded = (query: string, field: string) =>
  new RegExp(`${field}\\(first: \\d+\\)`).test(query);

Deno.test("job-get: every nested connection carries an explicit bound", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { job: { id: "j1" } } } }]);
  await action.execute({ jobId: "j1" }, ctx);
  const query = JSON.parse(calls[0].body!).query as string;

  for (const field of ["lineItems", "visits", "invoices"]) {
    assert(bounded(query, field), `${field} must carry a first/last bound`);
  }
  // An unbounded connection is costed as if it returned Jobber's 100-node
  // maximum, so a bare `field {` followed by `nodes` is the bug this guards.
  assert(!/\w+\s*\{\s*nodes/.test(query), "a connection was selected with no bound");
});

Deno.test("job-get: passes the id through and treats a null job as an answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { job: null } } }]);
  const out = await action.execute({ jobId: "j9" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { id: "j9" });
  assertEquals(out, { job: null });
});
