import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import campaignUnschedule from "../../actions/campaign-unschedule.ts";
import { API_PATH, errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("campaign-unschedule: POSTs to /campaigns/{campaignid}/unschedule.json", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await campaignUnschedule.execute({ campaignId: "cmp" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/campaigns/cmp/unschedule.json`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { CampaignID: "cmp" });
});

/**
 * Code 341 covers both "it was never scheduled" and "it has already started
 * sending". Swallowing it would hide the second, which is the alarming one.
 */
test("campaign-unschedule: surfaces code 341 rather than swallowing it", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody(341, "Campaign is not scheduled") }]);
  const err = await assertRejects(
    async () => await campaignUnschedule.execute({ campaignId: "cmp" }, ctx),
    Error,
  );
  assert(err.message.includes("code 341"), err.message);
});

test("campaign-unschedule: is declared idempotent", () => {
  assertEquals(campaignUnschedule.idempotent, true);
});
