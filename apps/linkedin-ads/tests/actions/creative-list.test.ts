import { assertEquals } from "@std/assert";
import creativeList from "../../actions/creative-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("creative-list: FINDER with q=criteria, each filter its own top-level List(...) param", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await creativeList.execute(
    { accountId: "520866471", creativeIds: "119962155", campaignIds: "360035215" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/520866471/creatives");
  assertEquals(calls[0].headers["x-restli-method"], "FINDER");
  const q = queryOf(calls[0].url);
  assertEquals(q.q, "criteria");
  assertEquals(q.creatives, "List(urn:li:sponsoredCreative:119962155)");
  assertEquals(q.campaigns, "List(urn:li:sponsoredCampaign:360035215)");
});

Deno.test("creative-list: intendedStatuses and isTestAccount pass straight through", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await creativeList.execute(
    { accountId: "1", intendedStatuses: ["ARCHIVED", "CANCELED"], isTestAccount: "true" },
    ctx,
  );
  const q = queryOf(calls[0].url);
  assertEquals(q.intendedStatuses, "List(ARCHIVED,CANCELED)");
  assertEquals(q.isTestAccount, "true");
});

Deno.test("creative-list: with no filters, still omits the List() params entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await creativeList.execute({ accountId: "1" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals("campaigns" in q, false);
  assertEquals("creatives" in q, false);
  assertEquals("contentReferences" in q, false);
});
