import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-update: PATCH /api/v3/customers/14 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 14 } }]);
  const out = await action.execute(
    { "customerId": 14, "notes": "vip", "defaultSiteId": 3, "siteIds": "3, 4" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v3/customers/14");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), { "notes": "vip", "default_site_id": 3, "site_ids": [3, 4] });
  assertEquals(out, { "id": 14 });

  await assertRejects(
    async () => await action.execute({ customerId: 14, siteIds: "3,x" }, mockCtx().ctx),
    Error,
    "not a numeric id",
  );
});
