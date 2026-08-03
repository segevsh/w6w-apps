import { assert, assertEquals } from "@std/assert";
import { connected, description, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/list-items.ts";

const ok = { status: 200, body: { list: [] } };

Deno.test("list-items: is a search action over the item resource", () => {
  assertEquals(action.key, "list-items");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "item");
});

Deno.test("list-items: GETs /items", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({}, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/items");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-items: sends every filter in operator form", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    itemFamilyId: "fam_1",
    type: "plan",
    status: "active",
    name: "Silver",
  }, connected(ctx));
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("item_family_id[is]"), "fam_1");
  assertEquals(q.get("type[is]"), "plan");
  assertEquals(q.get("status[is]"), "active");
  assertEquals(q.get("name[is]"), "Silver");
});

Deno.test("list-items: offers the three documented item types", () => {
  assertEquals(optionValues(action, "type"), ["plan", "addon", "charge"]);
  assertEquals(optionValues(action, "status"), ["active", "archived", "deleted"]);
});

Deno.test("list-items: sorts by name, id or updated_at — this endpoint's own set", async () => {
  assertEquals(optionValues(action, "sortAttribute"), ["name", "id", "updated_at"]);
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ sortAttribute: "name", sortOrder: "desc" }, connected(ctx));
  assertEquals(new URL(calls[0].url).searchParams.get("sort_by[desc]"), "name");
});

Deno.test("list-items: says out loud that it needs Product Catalog 2.0", () => {
  // This endpoint simply does not exist on a PC 1.0 site.
  assert(/Product Catalog 2\.0/.test(description(action)));
});
