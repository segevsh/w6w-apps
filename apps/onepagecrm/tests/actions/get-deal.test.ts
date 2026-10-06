import { assertEquals } from "@std/assert";
import getDeal from "../../actions/get-deal.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-deal: GET /deals/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ deal: { id: "d1", amount: 100 } }) }]);
  const out = await getDeal.execute({ dealId: "d1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v3/deals/d1");
  assertEquals(out.deal, { id: "d1", amount: 100 });
});
