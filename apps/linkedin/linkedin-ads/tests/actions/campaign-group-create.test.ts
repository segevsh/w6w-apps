import { assertEquals } from "@std/assert";
import campaignGroupCreate from "../../actions/campaign-group-create.ts";
import { createdResponse, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-group-create: a plain single POST (no batch wrapper), account URN built from accountId", async () => {
  const { ctx, calls } = mockCtx([createdResponse("512358882")]);
  const result = await campaignGroupCreate.execute(
    { accountId: "512352200", name: "CampaignGroup1", runScheduleStart: "2016-02-12" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/512352200/adCampaignGroups");
  assertEquals(calls[0].headers["x-restli-method"], undefined);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.account, "urn:li:sponsoredAccount:512352200");
  assertEquals(body.name, "CampaignGroup1");
  assertEquals(body.status, "ACTIVE");
  assertEquals(body.runSchedule, { start: Date.parse("2016-02-12T00:00:00Z") });
  assertEquals("end" in body.runSchedule, false);
  assertEquals(result, { id: "512358882" });
});

Deno.test("campaign-group-create: includes runSchedule.end and totalBudget when provided", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await campaignGroupCreate.execute(
    {
      accountId: "1",
      name: "G",
      runScheduleStart: "2024-01-01",
      runScheduleEnd: "2024-12-31",
      totalBudgetAmount: 60000,
      totalBudgetCurrency: "USD",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.runSchedule.end, Date.parse("2024-12-31T00:00:00Z"));
  assertEquals(body.totalBudget, { amount: "60000", currencyCode: "USD" });
});

Deno.test("campaign-group-create: is not idempotent", () => {
  assertEquals(campaignGroupCreate.idempotent, false);
});
