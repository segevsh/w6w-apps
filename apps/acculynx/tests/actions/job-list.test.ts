import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("job-list: sends GET /jobs and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 1, pageSize: 5, pageStartIndex: 10, items: [{ id: "j1" }] },
  }]);
  const out = await action.execute(
    { pageSize: 5, startIndex: 10, milestones: "lead,prospect", sortOrder: "Descending" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/jobs");
  assertEquals(queryOf(calls[0].url), {
    pageSize: "5",
    recordStartIndex: "10",
    milestones: "lead,prospect",
    sortOrder: "Descending",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { count: 1, pageSize: 5, pageStartIndex: 10, items: [{ id: "j1" }] });
});

Deno.test("job-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute(
        {
          pageSize: 5,
          startIndex: 10,
          milestones: "lead,prospect",
          sortOrder: "Descending",
        } as never,
        ctx,
      ),
    Error,
    "AccuLynx 404",
  );
});
