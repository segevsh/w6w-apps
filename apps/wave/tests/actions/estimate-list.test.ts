import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import estimateList from "../../actions/estimate-list.ts";

test("estimate-list: returns the estimates connection", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        business: {
          estimates: {
            pageInfo: { currentPage: 1, totalPages: 1, totalCount: 1 },
            edges: [{ node: { id: "e1", estimateNumber: "EST-001", status: "DRAFT" } }],
          },
        },
      },
    },
  }]);
  const out = await estimateList.execute({ businessId: "b1", status: "DRAFT" }, ctx) as {
    edges: unknown[];
  };
  assertEquals(out.edges.length, 1);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.status, "DRAFT");
  // sort is never sent — estimates.sort is a single enum, not a list, unlike
  // the other collections, and this action leaves it to Wave's own default.
  assertEquals(body.variables.sort, undefined);
});

test("estimate-list: type/resource metadata", () => {
  assertEquals(estimateList.type, "search");
  assertEquals(estimateList.resource, "estimate");
});
