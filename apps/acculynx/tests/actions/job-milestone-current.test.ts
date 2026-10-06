import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-milestone-current.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("job-milestone-current: sends GET /jobs/j1/milestones/current and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1", name: "Lead", isCurrent: true } }]);
  const out = await action.execute({ jobId: "j1" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/jobs/j1/milestones/current");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { id: "m1", name: "Lead", isCurrent: true });
});

Deno.test("job-milestone-current: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ jobId: "j1" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
