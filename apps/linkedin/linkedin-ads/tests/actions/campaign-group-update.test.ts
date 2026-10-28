import { assert, assertEquals, assertRejects } from "@std/assert";
import campaignGroupUpdate from "../../actions/campaign-group-update.ts";
import { mockCtx, noContentResponse, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-group-update: sends the batch-of-one shape (ids=List(id), BATCH_PARTIAL_UPDATE)", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  const result = await campaignGroupUpdate.execute(
    { accountId: "512352200", campaignGroupId: "604716214", status: "ACTIVE" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/512352200/adCampaignGroups");
  assertEquals(calls[0].headers["x-restli-method"], "BATCH_PARTIAL_UPDATE");
  assertEquals(queryOf(calls[0].url).ids, "List(604716214)");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { entities: { "604716214": { patch: { $set: { status: "ACTIVE" } } } } });
  assertEquals(result, { ok: true });
});

Deno.test("campaign-group-update: builds the totalBudget object from amount + currency", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  await campaignGroupUpdate.execute(
    { accountId: "1", campaignGroupId: "2", totalBudgetAmount: 3000, totalBudgetCurrency: "USD" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.entities["2"].patch.$set.totalBudget, { amount: "3000", currencyCode: "USD" });
});

Deno.test("campaign-group-update: rejects when nothing is set to change, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignGroupUpdate.execute({ accountId: "1", campaignGroupId: "2" }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-group-update: is idempotent — a $set patch's end state doesn't depend on retries", () => {
  assert(campaignGroupUpdate.idempotent);
});
