import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-get.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("job-get: sends GET /jobs/j%201 and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "j 1", jobNumber: "42" } }]);
  const out = await action.execute({ jobId: "j 1", includes: "contact" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/jobs/j%201");
  assertEquals(queryOf(calls[0].url), { includes: "contact" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { id: "j 1", jobNumber: "42" });
});

Deno.test("job-get: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ jobId: "j 1", includes: "contact" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
