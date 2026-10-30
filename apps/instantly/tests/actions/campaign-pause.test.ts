import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import campaignPause from "../../actions/campaign-pause.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("campaign-pause: POSTs /campaigns/{id}/pause", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", status: 2 } }]);
  const out = await campaignPause.execute({ id: "c1" }, ctx) as { status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/c1/pause");
  assertEquals(out.status, 2);
});
