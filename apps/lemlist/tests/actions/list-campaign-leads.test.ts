import { assert, assertEquals } from "@std/assert";
import listCampaignLeads from "../../actions/list-campaign-leads.ts";
import { mockCtx, param, params } from "../_helpers.ts";

Deno.test("list-campaign-leads: GETs /campaigns/{id}/leads/ WITH the trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listCampaignLeads.execute!({ campaignId: "cam_1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/campaigns/cam_1/leads/");
  assert(url.pathname.endsWith("/"), "lemlist documents this path with a trailing slash");
});

Deno.test("list-campaign-leads: forwards state and limit", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listCampaignLeads.execute!({ campaignId: "cam_1", state: "scanned", limit: 250 }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("state"), "scanned");
  assertEquals(p.get("limit"), "250");
});

Deno.test("list-campaign-leads: exposes no offset — lemlist does not document one here", () => {
  assertEquals(params(listCampaignLeads).map((p) => p.key), ["campaignId", "state", "limit"]);
  assertEquals(param(listCampaignLeads, "limit").validation?.max, 500);
});
