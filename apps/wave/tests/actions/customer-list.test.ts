import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import customerList from "../../actions/customer-list.ts";

test("customer-list: returns the customers connection", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        business: {
          customers: {
            pageInfo: { currentPage: 1, totalPages: 1, totalCount: 1 },
            edges: [{ node: { id: "c1", name: "Santa" } }],
          },
        },
      },
    },
  }]);
  const out = await customerList.execute({ businessId: "b1", email: "santa@example.com" }, ctx) as {
    edges: unknown[];
  };
  assertEquals(out.edges.length, 1);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.email, "santa@example.com");
});

test("customer-list: builds a [KEY_DIR] sort list only when sortKey is given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { business: { customers: { edges: [], pageInfo: {} } } } },
  }]);
  await customerList.execute(
    { businessId: "b1", sortKey: "NAME", sortDirection: "ASC" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.sort, ["NAME_ASC"]);
});

test("customer-list: type/resource metadata", () => {
  assertEquals(customerList.type, "search");
  assertEquals(customerList.resource, "customer");
});
