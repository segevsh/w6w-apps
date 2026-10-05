import { assertEquals, assertRejects } from "@std/assert";
import customerOrderList from "../../actions/customer-order-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "customerId": 1337,
  "createdAtMin": "2025-01-16T14:30:00Z",
  "createdAtMax": "2025-01-31",
  "testMode": "false",
};
const RESPONSE = [{ "id": 1 }];

Deno.test("customer-order-list: sends GET /v1/customers/1337/orders with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await customerOrderList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/customers/1337/orders");
  assertEquals(queryOf(calls[0].url), {
    "created_at_min": "2025-01-16T14:30:00Z",
    "created_at_max": "2025-01-31",
    "test_mode": "false",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("customer-order-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await customerOrderList.execute(INPUT, ctx), { "data": [{ "id": 1 }] });
});

Deno.test("customer-order-list: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(customerOrderList.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("customer-order-list: a non-integer customerId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        customerOrderList.execute({ ...INPUT, customerId: "1/../2" as unknown as number }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
