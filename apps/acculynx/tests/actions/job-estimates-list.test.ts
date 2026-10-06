import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-estimates-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("job-estimates-list: sends GET /jobs/j1/estimates and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 1, pageSize: 2, pageStartIndex: 0, items: [{ id: "e1", isPrimary: true }] },
  }]);
  const out = await action.execute({ jobId: "j1", pageSize: 2 } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/jobs/j1/estimates");
  assertEquals(queryOf(calls[0].url), { pageSize: "2" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, {
    count: 1,
    pageSize: 2,
    pageStartIndex: 0,
    items: [{ id: "e1", isPrimary: true }],
  });
});

Deno.test("job-estimates-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ jobId: "j1", pageSize: 2 } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
