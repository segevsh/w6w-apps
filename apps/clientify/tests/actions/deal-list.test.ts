import { assertEquals } from "@std/assert";
import dealList from "../../actions/deal-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-list: GET /v1/deals/", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { count: 1, next: null, previous: null, results: [{ id: 5, name: "Renewal" }] },
  }]);
  const result = await dealList.execute({
    query: "renewal",
    statusId: "1",
    filters: { "amount[gte]": 1000 },
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/deals/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), { "amount[gte]": "1000", query: "renewal", status_id: "1" });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    count: 1,
    next: null,
    previous: null,
    results: [{ id: 5, name: "Renewal" }],
  });
});

Deno.test("deal-list: declares type search", () => {
  assertEquals(dealList.type, "search");
});

Deno.test("deal-list: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await dealList.execute(
      { query: "renewal", statusId: "1", filters: { "amount[gte]": 1000 } },
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
