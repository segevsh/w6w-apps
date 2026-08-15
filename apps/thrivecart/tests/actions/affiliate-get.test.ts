import { assertEquals } from "@std/assert";
import affiliateGet from "../../actions/affiliate-get.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-get: calls POST /affiliate with the affiliate id in the form body", async () => {
  const { ctx, calls } = mockCtx([{ body: { user_id: "649", name: "Edward Mann" } }]);
  const out = await affiliateGet.execute({ affiliateId: "edward_mann" }, ctx) as { name: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/affiliate");
  assertEquals(formOf(calls[0]), { affiliate_id: "edward_mann" });
  assertEquals(out.name, "Edward Mann");
});
