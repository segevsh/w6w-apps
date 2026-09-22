import { assertEquals } from "@std/assert";

import listDeals from "../../actions/list-deals.ts";
import { envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("list-deals: GET /deals maps every filter to its documented query name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("deals", []) }]);

  await listDeals.execute(
    {
      page: 2,
      limit: 100,
      order: "created_at",
      direction: "desc",
      name: "Renewal",
      win: "true",
      userId: "u1",
      dealStageId: "s1",
      dealPipelineId: "p1",
      dealLostReasonId: "r1",
      organization: "o1",
      campaignId: "camp1",
    },
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(queryOf(calls[0].url), {
    page: "2",
    limit: "100",
    order: "created_at",
    direction: "desc",
    name: "Renewal",
    win: "true",
    user_id: "u1",
    deal_stage_id: "s1",
    deal_pipeline_id: "p1",
    deal_lost_reason_id: "r1",
    organization: "o1",
    campaign_id: "camp1",
  });
});

Deno.test("list-deals: leaving the outcome empty sends no win at all (the API's 'open' form)", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("deals", []) }]);

  await listDeals.execute({ win: "" }, ctx);

  assertEquals(queryOf(calls[0].url), {});
  const win = listDeals.params?.find((p) => p.key === "win");
  const options = Array.isArray(win?.options) ? win.options : [];
  assertEquals(options.map((o) => o.value), ["true", "false"]);
});

Deno.test("list-deals: the vendor's deal envelope (incl. next_page) is returned verbatim", async () => {
  const payload = { deals: [{ _id: "d1" }], has_more: true, total: 40, next_page: 3 };
  const { ctx } = mockCtx([{ body: payload }]);

  assertEquals(await listDeals.execute({}, ctx), payload);
});
