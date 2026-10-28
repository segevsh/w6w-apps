import { assertEquals, assertRejects } from "@std/assert";
import campaignCreate from "../../actions/campaign-create.ts";
import { createdResponse, mockCtx, pathOf } from "../_helpers.ts";

const BASE = {
  accountId: "518121035",
  campaignGroupId: "635137195",
  name: "Campaign Text ads A",
  type: "TEXT_AD",
  costType: "CPC",
  localeCountry: "US",
  localeLanguage: "en",
  dailyBudgetAmount: 18,
  targetingCriteria: JSON.stringify({
    include: { and: [{ or: { "urn:li:adTargetingFacet:locations": ["urn:li:geo:103644278"] } }] },
  }),
};

Deno.test("campaign-create: requires either a daily or a total budget, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const { dailyBudgetAmount: _drop, ...noBudget } = BASE;
  await assertRejects(
    async () => await campaignCreate.execute(noBudget as never, ctx),
    Error,
    "budget",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-create: a plain single POST, account/campaignGroup as URNs, targeting parsed from JSON", async () => {
  const { ctx, calls } = mockCtx([createdResponse("360035215")]);
  const result = await campaignCreate.execute(BASE, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/518121035/adCampaigns");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.account, "urn:li:sponsoredAccount:518121035");
  assertEquals(body.campaignGroup, "urn:li:sponsoredCampaignGroup:635137195");
  assertEquals(body.locale, { country: "US", language: "en" });
  assertEquals(body.dailyBudget, { amount: "18", currencyCode: "USD" });
  assertEquals(body.targetingCriteria.include.and.length, 1);
  assertEquals(body.status, "ACTIVE");
  assertEquals(body.unitCost, { amount: "0", currencyCode: "USD" });
  assertEquals("runSchedule" in body, false);
  assertEquals(result, { id: "360035215" });
});

Deno.test("campaign-create: includes runSchedule only when a date is given", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await campaignCreate.execute({ ...BASE, runScheduleStart: "2016-02-12" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.runSchedule, { start: Date.parse("2016-02-12T00:00:00Z") });
});

Deno.test("campaign-create: malformed targetingCriteria JSON fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignCreate.execute({ ...BASE, targetingCriteria: "{not json" }, ctx),
    Error,
    "targetingCriteria is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-create: is not idempotent", () => {
  assertEquals(campaignCreate.idempotent, false);
});
