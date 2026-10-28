import { assertEquals } from "@std/assert";
import campaignGroupList from "../../actions/campaign-group-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-group-list: scopes the path to the Ad Account, q=search with no filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await campaignGroupList.execute({ accountId: "512352200" }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/512352200/adCampaignGroups");
  assertEquals(queryOf(calls[0].url).q, "search");
});

Deno.test("campaign-group-list: builds a search from ids/names/statuses", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await campaignGroupList.execute(
    { accountId: "1", ids: "604716214,604716224", statuses: ["ACTIVE"] },
    ctx,
  );

  assertEquals(
    queryOf(calls[0].url).search,
    "(id:(values:List(604716214,604716224)),status:(values:List(ACTIVE)))",
  );
});

Deno.test("campaign-group-list: returns the elements/metadata body verbatim", async () => {
  const body = { elements: [{ id: 1 }], metadata: { nextPageToken: null } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await campaignGroupList.execute({ accountId: "1" }, ctx), body);
});
