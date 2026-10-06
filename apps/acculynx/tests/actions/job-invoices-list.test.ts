import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-invoices-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("job-invoices-list: sends GET /jobs/j1/invoices and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      count: 1,
      pageSize: 10,
      pageStartIndex: 5,
      items: [{ id: "i1", currentInvoiceState: "Unpaid" }],
    },
  }]);
  const out = await action.execute(
    { jobId: "j1", startIndex: 5, sortOrder: "Descending" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/jobs/j1/invoices");
  assertEquals(queryOf(calls[0].url), { pageStartIndex: "5", sortOrder: "Descending" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, {
    count: 1,
    pageSize: 10,
    pageStartIndex: 5,
    items: [{ id: "i1", currentInvoiceState: "Unpaid" }],
  });
});

Deno.test("job-invoices-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute({ jobId: "j1", startIndex: 5, sortOrder: "Descending" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
