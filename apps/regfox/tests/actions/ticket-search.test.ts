import { assert, assertEquals } from "@std/assert";
import action from "../../actions/ticket-search.ts";
import { envelope, exec, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("ticket-search: sends product, its filters and paging, returns items and the cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ id: 1 }, { id: 2 }], { totalResults: 7, startingAfter: 2, hasMore: true }),
  }]);
  const out = await exec(action, {
    product: "regfox.com",
    limit: 2,
    sort: "desc",
    startingAfter: 1,
    dateCreatedAfter: "2026-01-01",
    ...({ "orderId": 9 }),
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/public/search/tickets");
  const q = queryOf(calls[0].url);
  assertEquals(q.product, "regfox.com");
  assertEquals(q.limit, "2");
  assertEquals(q.sort, "desc");
  assertEquals(q.startingAfter, "1");
  assertEquals(q.dateCreatedAfter, "2026-01-01");
  for (const [k, v] of Object.entries({ "orderId": 9 })) assertEquals(q[k], String(v));
  assertEquals(out.items, [{ id: 1 }, { id: 2 }]);
  assertEquals(out.totalResults, 7);
  assertEquals(out.hasMore, true);
  assertEquals(out.startingAfter, 2);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("ticket-search: declares a required product and is a search action", () => {
  assertEquals(action.type, "search");
  assert(action.params!.find((p) => p.key === "product")?.required);
});

Deno.test("ticket-search: an error envelope throws with the vendor's text", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { responseCode: 404, error: { code: 4404, description: "invalid apiKey" } },
  }]);
  let msg = "";
  try {
    await exec(action, { product: "regfox.com" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("invalid apiKey") && msg.includes("4404"), msg);
});
