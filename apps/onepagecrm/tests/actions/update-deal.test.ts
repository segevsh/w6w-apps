import { assertEquals } from "@std/assert";
import updateDeal from "../../actions/update-deal.ts";
import { bodyOf, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("update-deal: PUT /deals/{id}?partial=true with only the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ deal: { id: "d1", status: "won" } }) }]);
  const out = await updateDeal.execute({
    dealId: "d1",
    status: "won",
    closeDate: "2026-10-06",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/deals/d1");
  assertEquals(queryOf(calls[0].url), { partial: "true" });
  assertEquals(bodyOf(calls[0]), { status: "won", close_date: "2026-10-06" });
  assertEquals(out.deal, { id: "d1", status: "won" });
});

Deno.test("update-deal: replace=true omits partial", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ deal: {} }) }]);
  await updateDeal.execute({ dealId: "d1", name: "n", replace: true }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
