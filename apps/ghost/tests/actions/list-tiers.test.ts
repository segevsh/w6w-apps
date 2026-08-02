import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tiers.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("list-tiers: GETs /tiers/ with default paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { tiers: [{ id: "1", name: "Free" }] } }], { display });
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/ghost/api/admin/tiers/");
  assertEquals(url.searchParams.get("limit"), "15");
  assertEquals(result.items, [{ id: "1", name: "Free" }]);
});
