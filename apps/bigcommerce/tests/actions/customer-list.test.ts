import { assert, assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-list: uses the v3 path, not the deprecated /v2/customers", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ id: 12 }],
      meta: { pagination: { total: 1 }, cursor_pagination: { end_cursor: "zzz" } },
    },
  }]);
  const out = await customerList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/customers");
  assertEquals(out.data, [{ id: 12 }]);
});

Deno.test("customer-list: returns BOTH pagination blocks, because the meta shape varies", async () => {
  // The vendor documents: both on page 1, only `pagination` when page > 1, only
  // `cursor_pagination` when after/before was supplied. Flattening loses one.
  const { ctx } = mockCtx([{
    body: {
      data: [],
      meta: { pagination: { total: 0 }, cursor_pagination: { end_cursor: "zzz" } },
    },
  }]);
  const out = await customerList.execute({}, ctx);
  assertEquals(out.pagination, { total: 0 });
  assertEquals(out.cursor, { end_cursor: "zzz" });
});

Deno.test("customer-list: every filter is an :in list form", async () => {
  // There is no singular `email` filter on this endpoint.
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: {} } }]);
  await customerList.execute({
    emails: "jane@example.com, john@example.com",
    ids: "12,13",
    nameLike: "Do",
    include: ["addresses"],
    sort: "date_created:desc",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    "email:in": "jane@example.com,john@example.com",
    "id:in": "12,13",
    "name:like": "Do",
    include: "addresses",
    sort: "date_created:desc",
  });
});

Deno.test("customer-list: sort tokens carry their own direction, unlike Orders", () => {
  const sort = customerList.params?.find((p) => p.key === "sort");
  const values = (sort?.options as Array<{ value: string }>).map((o) => o.value);
  assert(values.every((v) => v.includes(":")), values.join(","));
});
