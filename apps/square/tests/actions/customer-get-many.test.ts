import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/customer-get-many.ts";

Deno.test("customer-get-many: GETs /v2/customers and maps the params", async () => {
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

Deno.test("customer-get-many: omits `count` entirely when it is not requested", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("customer-get-many: declares the optional total count in its output", () => {
  const keys = (action.output as Array<{ key: string }>).map((o) => o.key);
  assert(keys.includes("count"));
  assert(keys.includes("customers"));
});

Deno.test("customer-get-many: the sort options are Square's CustomerSortField enum", () => {
  const p = action.params?.find((p) => p.key === "sortField");
  assertEquals(
    optionValues(p),
    ["DEFAULT", "CREATED_AT"],
  );
});
