import { assertEquals, assertRejects } from "@std/assert";
import funnelOrderList from "../../actions/funnel-order-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "funnelId": 1337,
  "createdAtMin": "2025-01-16T14:30:00Z",
  "createdAtMax": "2025-01-31",
  "testMode": "false",
  "offset": 100,
  "limit": 25,
  "dir": "prev",
};
const RESPONSE = {
  "data": [{ "id": 1 }],
  "pagination": { "next": "https://api.samcart.com/v1/x?offset=99&dir=next", "prev": null },
};

Deno.test("funnel-order-list: sends GET /v1/funnels/1337/orders with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await funnelOrderList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/funnels/1337/orders");
  assertEquals(queryOf(calls[0].url), {
    "created_at_min": "2025-01-16T14:30:00Z",
    "created_at_max": "2025-01-31",
    "test_mode": "false",
    "offset": "100",
    "limit": "25",
    "dir": "prev",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("funnel-order-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await funnelOrderList.execute(INPUT, ctx), {
    "data": [{ "id": 1 }],
    "next": "https://api.samcart.com/v1/x?offset=99&dir=next",
    "prev": null,
    "nextOffset": "99",
  });
});

Deno.test("funnel-order-list: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(funnelOrderList.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("funnel-order-list: a non-integer funnelId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        funnelOrderList.execute({ ...INPUT, funnelId: "1/../2" as unknown as number }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
