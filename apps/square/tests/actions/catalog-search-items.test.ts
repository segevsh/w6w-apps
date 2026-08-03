import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/catalog-search-items.ts";

Deno.test("catalog-search-items: POSTs /v2/catalog/search-catalog-items", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ textFilter: "latte" }, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/catalog/search-catalog-items");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { text_filter: "latte" });
});

Deno.test("catalog-search-items: splits the comma-separated id lists", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ categoryIds: "C1, C2", enabledLocationIds: "L1 ,L2 " }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.category_ids, ["C1", "C2"]);
  assertEquals(body.enabled_location_ids, ["L1", "L2"]);
});

Deno.test("catalog-search-items: drops empty id lists rather than sending []", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ textFilter: "x", categoryIds: "" }, ctx);
  assertEquals("category_ids" in JSON.parse(calls[0].body!), false);
});

Deno.test("catalog-search-items: maps the remaining filters onto Square's names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    productTypes: ["REGULAR"],
    archivedState: "ARCHIVED_STATE_NOT_ARCHIVED",
    sortOrder: "DESC",
    limit: 10,
    cursor: "c",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.product_types, ["REGULAR"]);
  assertEquals(body.archived_state, "ARCHIVED_STATE_NOT_ARCHIVED");
  assertEquals(body.sort_order, "DESC");
  assertEquals(body.limit, 10);
  assertEquals(body.cursor, "c");
});

Deno.test("catalog-search-items: declares matched_variation_ids in its output", () => {
  const keys = (action.output as Array<{ key: string }>).map((o) => o.key);
  assert(keys.includes("matched_variation_ids"));
  assert(keys.includes("items"));
});

Deno.test("catalog-search-items: the archived-state options are Square's ArchivedState enum", () => {
  const p = action.params?.find((p) => p.key === "archivedState");
  assertEquals(
    optionValues(p),
    ["ARCHIVED_STATE_NOT_ARCHIVED", "ARCHIVED_STATE_ARCHIVED", "ARCHIVED_STATE_ALL"],
  );
});
