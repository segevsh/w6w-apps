import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/service-item-get-many.ts";

Deno.test("service-item-get-many: GETs the catalog and unwraps `service_items`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { service_items: [{ display_id: 1 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/service_catalog/items");
  assertEquals(out, { service_items: [{ display_id: 1 }] });
});

Deno.test("service-item-get-many: filters by category", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { service_items: [] } }]);
  await action.execute({ categoryId: 811100, page: 1, perPage: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("category_id"), "811100");
  assertEquals(url.searchParams.get("per_page"), "10");
});
