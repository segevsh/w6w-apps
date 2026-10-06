import { assertEquals } from "@std/assert";
import listDeals from "../../actions/list-deals.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-deals: GET /deals with status, stage and pipeline filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: listEnvelope("deals", [{ deal: { id: "d1" }, contacts: [] }]),
  }]);
  const out = await listDeals.execute({
    status: "pending",
    stage: 20,
    pipelineId: "p1",
    contactId: "c1",
    sortBy: "close_date",
  }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v3/deals");
  assertEquals(queryOf(calls[0].url), {
    status: "pending",
    stage: "20",
    pipeline_id: "p1",
    contact_id: "c1",
    sort_by: "close_date",
  });
  assertEquals((out.items as unknown[]).length, 1);
});

Deno.test("list-deals: stage 0 is still sent (falsy but meaningful)", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("deals", []) }]);
  await listDeals.execute({ stage: 0 }, ctx);
  assertEquals(queryOf(calls[0].url), { stage: "0" });
});
