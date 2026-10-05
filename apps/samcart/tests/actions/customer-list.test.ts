import { assertEquals, assertRejects } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "email": "jdoe@gmail.com",
  "createdAtMin": "2025-01-16T14:30:00Z",
  "createdAtMax": "2025-01-31",
  "offset": 100,
  "limit": 25,
  "dir": "prev",
};
const RESPONSE = {
  "data": [{ "id": 1 }],
  "pagination": { "next": "https://api.samcart.com/v1/x?offset=99&dir=next", "prev": null },
};

Deno.test("customer-list: sends GET /v1/customers with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await customerList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/customers");
  assertEquals(queryOf(calls[0].url), {
    "email": "jdoe@gmail.com",
    "created_at_min": "2025-01-16T14:30:00Z",
    "created_at_max": "2025-01-31",
    "offset": "100",
    "limit": "25",
    "dir": "prev",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("customer-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await customerList.execute(INPUT, ctx), {
    "data": [{ "id": 1 }],
    "next": "https://api.samcart.com/v1/x?offset=99&dir=next",
    "prev": null,
    "nextOffset": "99",
  });
});

Deno.test("customer-list: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(() => Promise.resolve(customerList.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});
