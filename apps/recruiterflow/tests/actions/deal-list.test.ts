import { assertEquals } from "@std/assert";
import dealList from "../../actions/deal-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-list: GET /deals/list with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const out = await dealList.execute({ "userId": 3, "itemsPerPage": 5 } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/deals/list");
  assertEquals(queryOf(calls[0].url), { "user_id": "3", "items_per_page": "5" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("deal-list: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await dealList.execute({ "userId": 3, "itemsPerPage": 5 } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
