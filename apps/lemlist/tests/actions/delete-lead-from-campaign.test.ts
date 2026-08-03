import { assert, assertEquals } from "@std/assert";
import deleteLeadFromCampaign from "../../actions/delete-lead-from-campaign.ts";
import { mockCtx, optionValues, param } from "../_helpers.ts";

Deno.test("delete-lead-from-campaign: DELETEs with action=remove by default", async () => {
  // Omitting `action` makes lemlist UNSUBSCRIBE instead of delete, which is
  // team-wide — so the default must be explicit.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await deleteLeadFromCampaign.execute!(
    { campaignId: "cam_1", leadId: "lea_1", action: "remove" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/campaigns/cam_1/leads/lea_1");
  assertEquals(url.searchParams.get("action"), "remove");
});

Deno.test("delete-lead-from-campaign: declares remove as the param default", () => {
  assertEquals(param(deleteLeadFromCampaign, "action").default, "remove");
  assertEquals(optionValues(deleteLeadFromCampaign, "action"), ["remove"]);
});

Deno.test("delete-lead-from-campaign: clearing action drops it, selecting the unsubscribe path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await deleteLeadFromCampaign.execute!({ campaignId: "cam_1", leadId: "a@b.com" }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("action"));
});

Deno.test("delete-lead-from-campaign: is idempotent — a repeat 404s rather than compounding", () => {
  assertEquals(deleteLeadFromCampaign.type, "perform");
  assertEquals(deleteLeadFromCampaign.idempotent, true);
});
