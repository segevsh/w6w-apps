import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: lists every campaign with no query params", async () => {
  const page = { campaigns: [{ id: "IVM0I3WNJJL0", name: "Default" }] };
  const { ctx, calls } = mockCtx([{ status: 200, body: page }]);
  const result = await campaignList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(result, page);
});
