import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { mockCtx, page } from "../_helpers.ts";

Deno.test("campaign-list: GETs /campaigns with no parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, title: "August" }], { total: 12 }) }]);
  const out = await campaignList.execute({}, ctx) as { total: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.sendfox.com/campaigns");
  assertEquals(out.total, 12);
});
