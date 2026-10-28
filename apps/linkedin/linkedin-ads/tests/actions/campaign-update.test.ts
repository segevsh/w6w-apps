import { assertEquals, assertRejects } from "@std/assert";
import campaignUpdate from "../../actions/campaign-update.ts";
import { mockCtx, noContentResponse, pathOf } from "../_helpers.ts";

Deno.test("campaign-update: a plain single PARTIAL_UPDATE, no batch wrapper", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  const result = await campaignUpdate.execute(
    { accountId: "1", campaignId: "141049524", status: "PAUSED" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/1/adCampaigns/141049524");
  assertEquals(calls[0].headers["x-restli-method"], "PARTIAL_UPDATE");
  assertEquals(JSON.parse(calls[0].body!), { patch: { $set: { status: "PAUSED" } } });
  assertEquals(result, { ok: true });
});

Deno.test("campaign-update: parses targetingCriteria JSON into the patch", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  await campaignUpdate.execute(
    { accountId: "1", campaignId: "2", targetingCriteria: JSON.stringify({ include: {} }) },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.patch.$set.targetingCriteria, { include: {} });
});

Deno.test("campaign-update: rejects when nothing is set to change, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignUpdate.execute({ accountId: "1", campaignId: "2" }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
