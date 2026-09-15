import { assertEquals } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-get: fetches by id and unwraps the campaign", async () => {
  const campaign = { id: "IVM0I3WNJJL0", name: "Default" };
  const { ctx, calls } = mockCtx([{ status: 200, body: { campaign } }]);
  const result = await campaignGet.execute({ id: "IVM0I3WNJJL0" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/IVM0I3WNJJL0");
  assertEquals(result, campaign);
});
