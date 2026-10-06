import { assertEquals } from "@std/assert";
import action from "../../actions/customer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-list: GET /api/v3/customers with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "id": 10 }],
    headers: {
      "current-page": "1",
      "page-items": "100",
      "total-count": "250",
      "total-pages": "3",
      "content-type": "application/json",
    },
  }]);
  const out = await action.execute({ "page": 2 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/customers");
  assertEquals(queryOf(calls[0].url), { "page": "2" });
  assertEquals(calls[0].body, null);

  assertEquals(out, {
    items: [{ id: 10 }],
    pagination: { currentPage: 1, pageItems: 100, totalCount: 250, totalPages: 3, nextPage: 2 },
  });
});
