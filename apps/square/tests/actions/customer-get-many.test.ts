import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/customer-get-many.ts";

test("customer-get-many: GETs /v2/customers and maps the params", async () => {
  const { ctx, calls } = mockCtx([{ body: { customers: [] } }]);
  await action.execute(
    { sortField: "CREATED_AT", sortOrder: "DESC", count: true, limit: 20, cursor: "c" },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("sort_field"), "CREATED_AT");
  assertEquals(q.get("sort_order"), "DESC");
  assertEquals(q.get("count"), "true");
  assertEquals(q.get("limit"), "20");
  assertEquals(q.get("cursor"), "c");
});

test("customer-get-many: omits `count` entirely when it is not requested", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

test("customer-get-many: declares the optional total count in its output", () => {
  const keys = (action.output as Array<{ key: string }>).map((o) => o.key);
  assert(keys.includes("count"));
  assert(keys.includes("customers"));
});

test("customer-get-many: the sort options are Square's CustomerSortField enum", () => {
  const p = action.params?.find((p) => p.key === "sortField");
  assertEquals(
    optionValues(p),
    ["DEFAULT", "CREATED_AT"],
  );
});
