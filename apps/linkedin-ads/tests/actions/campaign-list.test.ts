import { assertEquals, assertRejects } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: rejects an unfiltered search — LinkedIn requires at least one criterion", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignList.execute({ accountId: "1" }, ctx),
    Error,
    "search filter",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-list: builds campaignGroup URNs from bare ids inside the search", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await campaignList.execute({ accountId: "506289162", campaignGroupIds: "635137195" }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/506289162/adCampaigns");
  assertEquals(
    queryOf(calls[0].url).search,
    "(campaignGroup:(values:List(urn:li:sponsoredCampaignGroup:635137195)))",
  );
});

Deno.test("campaign-list: statuses, types and the test scalar combine in one search", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await campaignList.execute(
    { accountId: "1", statuses: ["ACTIVE"], types: ["SPONSORED_UPDATES"], test: "false" },
    ctx,
  );
  assertEquals(
    queryOf(calls[0].url).search,
    "(status:(values:List(ACTIVE)),type:(values:List(SPONSORED_UPDATES)),test:false)",
  );
});
