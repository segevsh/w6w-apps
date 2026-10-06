import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-representatives-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("job-representatives-list: sends GET /jobs/j1/representatives and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 1, pageSize: 10, pageStartIndex: 20, items: [{ id: "r1", type: "SalesOwner" }] },
  }]);
  const out = await action.execute({ jobId: "j1", startIndex: 20 } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/jobs/j1/representatives");
  assertEquals(queryOf(calls[0].url), { recordStartIndex: "20" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, {
    count: 1,
    pageSize: 10,
    pageStartIndex: 20,
    items: [{ id: "r1", type: "SalesOwner" }],
  });
});

Deno.test("job-representatives-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ jobId: "j1", startIndex: 20 } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
