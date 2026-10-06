import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/order-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "limit": 5, "sortOrder": "desc" } as Record<string, unknown>;
const RESPONSE: unknown = {
  "orders": [{ "id": 1 }],
  "next_page_url": "https://api.loopreturns.com/api/v1/orders?cursor=zz&limit=5",
  "previous_page_url": null,
};
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("order-list: GET /orders", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/orders");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), { "limit": "5", "sort_order": "desc" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out, {
    "orders": [{ "id": 1 }],
    "nextCursor": "zz",
    "nextPageUrl": "https://api.loopreturns.com/api/v1/orders?cursor=zz&limit=5",
  });
});

Deno.test("order-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("order-list: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});
