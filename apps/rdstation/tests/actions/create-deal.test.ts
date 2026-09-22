import { assertEquals } from "@std/assert";

import createDeal from "../../actions/create-deal.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("create-deal: POST /deals with the deal fields and both {_id} links", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "d1" } }]);

  await createDeal.execute(
    {
      name: "Renewal 2027",
      dealStageId: "s1",
      userId: "u1",
      rating: 3,
      predictionDate: "2027-01-31",
      organizationId: "o1",
      campaignId: "camp1",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/deals`);
  assertEquals(bodyOf(calls[0]), {
    deal: {
      name: "Renewal 2027",
      deal_stage_id: "s1",
      user_id: "u1",
      rating: 3,
      prediction_date: "2027-01-31",
    },
    organization: { _id: "o1" },
    campaign: { _id: "camp1" },
  });
});

Deno.test("create-deal: with no links the body carries only the deal key", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);

  await createDeal.execute({ name: "Bare" }, ctx);

  assertEquals(bodyOf(calls[0]), { deal: { name: "Bare" } });
});

Deno.test("create-deal: rating stays a number and only one link is sent when only one is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);

  await createDeal.execute({ rating: 0, organizationId: "o1" }, ctx);

  const body = bodyOf(calls[0]) as { deal: { rating?: unknown }; campaign?: unknown };
  assertEquals(body.deal.rating, 0);
  assertEquals(body.campaign, undefined);
});

Deno.test("create-deal: the unsupported nested deal sub-objects are not exposed", () => {
  const keys = (createDeal.params ?? []).map((p) => p.key).sort();
  assertEquals(keys, [
    "campaignId",
    "dealStageId",
    "name",
    "organizationId",
    "predictionDate",
    "rating",
    "userId",
  ]);
  assertEquals(createDeal.idempotent, false);
});
